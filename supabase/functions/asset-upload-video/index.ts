import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authenticateRequest, authorizeWorkspace, assertTenantActive, assertActiveSubscription, toErrorResponse } from "../_shared/auth.ts";
import { ensureGumletWorkspace, normalizeVideoSettings } from "../_shared/gumlet.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type VideoUploadRequest = {
  tenant_id: string;
  title: string;
  description?: string;
  folder_id?: string | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const identity = await authenticateRequest(req, supabaseAdmin);

    // 2. Parse request
    const body = (await req.json()) as VideoUploadRequest;
    if (!body?.tenant_id || !body?.title) {
      return new Response(
        JSON.stringify({ error: "tenant_id and title are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Validate user is editor of tenant
    const auth = await authorizeWorkspace(identity, body.tenant_id, supabaseAdmin, { minRole: "editor" });
    await assertTenantActive(supabaseAdmin, body.tenant_id);
    await assertActiveSubscription(supabaseAdmin, body.tenant_id);

    // 4. Check Gumlet credentials
    const gumletApiKey = Deno.env.get("GUMLET_API_KEY");

    if (!gumletApiKey) {
      return new Response(JSON.stringify({ error: "Gumlet not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("tenant_settings")
      .select("plan, video_settings, gumlet_workspace_id")
      .eq("tenant_id", body.tenant_id)
      .single();

    if (settingsError || !settings) {
      console.error("Failed to fetch tenant settings:", settingsError);
      return new Response(JSON.stringify({ error: "Failed to load tenant settings" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isPro = ["pro", "business"].includes(settings.plan ?? "free");
    const videoSettings = normalizeVideoSettings(settings.video_settings);
    const shouldGenerateSubtitles = isPro && videoSettings.player.captions_generate_auto;

    // 5. Ensure tenant has a Gumlet workspace (create if needed)
    const workspaceId = await ensureGumletWorkspace(
      supabaseAdmin,
      gumletApiKey,
      body.tenant_id,
      { existingWorkspaceId: settings.gumlet_workspace_id }
    );

    if (!workspaceId) {
      return new Response(
        JSON.stringify({ error: "Failed to ensure Gumlet workspace for tenant" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Using Gumlet workspace ${workspaceId} for tenant ${body.tenant_id}`);

    // 6. Create asset record with status='uploading'
    const { data: assetData, error: assetError } = await supabaseAdmin
      .from("assets")
      .insert({
        tenant_id: body.tenant_id,
        type: "video",
        title: body.title,
        description: body.description ?? null,
        folder_id: body.folder_id ?? null,
        status: "uploading",
        created_by: auth.userId,
      })
      .select("id")
      .single();

    if (assetError || !assetData) {
      console.error("Failed to create asset:", assetError);
      return new Response(JSON.stringify({ error: "Failed to create asset" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const assetId = assetData.id;

    // 7. Request upload URL from hosting backend with collection_id (their term for workspace).
    // Subtitles are requested only when the tenant is Pro/Business and the
    // auto-generation toggle is enabled in Design > Video Player.
    const gumletPayload: Record<string, unknown> = {
      collection_id: workspaceId,
      format: "hls",
      title: assetId,
    };

    if (shouldGenerateSubtitles) {
      gumletPayload.generate_subtitles = {
        audio_language: "pt",
        subtitle_languages: "pt,en,es",
      };
    }

    const gumletResp = await fetch("https://api.gumlet.com/v1/video/assets/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${gumletApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(gumletPayload),
    });

    const gumletJson = await gumletResp.json();

    if (!gumletResp.ok) {
      // Rollback asset
      await supabaseAdmin.from("assets").delete().eq("id", assetId);
      return new Response(
        JSON.stringify({ error: "Gumlet upload creation failed", details: gumletJson }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const gumletAssetId = gumletJson?.asset_id || gumletJson?.asset?.id || gumletJson?.id;
    const uploadUrl = gumletJson?.upload_url || gumletJson?.original_download_url || gumletJson?.url;

    if (!gumletAssetId || !uploadUrl) {
      await supabaseAdmin.from("assets").delete().eq("id", assetId);
      return new Response(
        JSON.stringify({ error: "Missing Gumlet asset_id or upload_url" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 8. Construct predictable thumbnail URL
    // Gumlet thumbnail format: https://video.gumlet.io/{WORKSPACE_ID}/{ASSET_ID}/thumbnail-1-0.png
    const thumbnailUrl = `https://video.gumlet.io/${workspaceId}/${gumletAssetId}/thumbnail-1-0.png`;

    // 9. Create asset_videos record with workspace reference and thumbnail
    const { error: videoError } = await supabaseAdmin.from("asset_videos").insert({
      asset_id: assetId,
      gumlet_asset_id: gumletAssetId,
      thumbnail_url: thumbnailUrl,
      subtitles_status: shouldGenerateSubtitles ? "generating" : null,
      processing_meta: {
        ...gumletJson,
        workspace_id: workspaceId,
        subtitles_requested: shouldGenerateSubtitles,
      },
    });

    if (videoError) {
      console.error("Failed to create asset_videos:", videoError);
      await supabaseAdmin.from("assets").delete().eq("id", assetId);
      return new Response(JSON.stringify({ error: "Failed to create video record" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Note: status stays "uploading" until the Gumlet webhook event.video.uploaded
    // confirms the bytes actually reached Gumlet. This prevents orphan "processing"
    // records when the user closes the browser or the PUT to S3 fails.

    return new Response(
      JSON.stringify({
        asset_id: assetId,
        gumlet_asset_id: gumletAssetId,
        upload_url: uploadUrl,
        workspace_id: workspaceId,
        subtitles_requested: shouldGenerateSubtitles,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("asset-upload-video error:", error);
    return toErrorResponse(error, corsHeaders);
  }
});

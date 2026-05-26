import type { VideoProvider } from "@/types/database";

const allowedEmbedHosts = [
  "youtube.com",
  "www.youtube.com",
  "youtu.be",
  "www.youtu.be",
  "vimeo.com",
  "www.vimeo.com",
  "player.vimeo.com",
  "panda.video",
  "player.panda.video"
];

export function getVideoEmbedUrl(provider: VideoProvider, videoUrl: string | null, embedCode: string | null) {
  if (provider === "embed") {
    return getSafeEmbedSrc(embedCode) ?? getSafeEmbedSrc(videoUrl);
  }

  if (!videoUrl) return null;

  if (provider === "youtube") return getYouTubeEmbed(videoUrl);
  if (provider === "vimeo") return getVimeoEmbed(videoUrl);
  if (provider === "panda") return getSafeUrl(videoUrl, ["panda.video", "player.panda.video"]);
  if (provider === "self_hosted") return getSafeUrl(videoUrl, []);

  return null;
}

export function isDirectVideo(provider: VideoProvider) {
  return provider === "self_hosted";
}

function getYouTubeEmbed(value: string) {
  const url = getUrl(value);
  if (!url) return null;

  let id = "";
  if (url.hostname.includes("youtu.be")) {
    id = url.pathname.split("/").filter(Boolean)[0] ?? "";
  } else if (url.pathname.startsWith("/embed/")) {
    id = url.pathname.split("/")[2] ?? "";
  } else {
    id = url.searchParams.get("v") ?? "";
  }

  if (!/^[a-zA-Z0-9_-]{6,}$/.test(id)) return null;
  return `https://www.youtube.com/embed/${id}`;
}

function getVimeoEmbed(value: string) {
  const url = getUrl(value);
  if (!url) return null;

  if (url.hostname === "player.vimeo.com" && url.pathname.startsWith("/video/")) {
    return url.toString();
  }

  const id = url.pathname.split("/").filter(Boolean).find((part) => /^\d+$/.test(part));
  if (!id) return null;
  return `https://player.vimeo.com/video/${id}`;
}

function getSafeEmbedSrc(value: string | null) {
  if (!value) return null;
  const iframeSrc = value.match(/src=["']([^"']+)["']/i)?.[1] ?? value;
  return getSafeUrl(iframeSrc, allowedEmbedHosts);
}

function getSafeUrl(value: string, allowedHosts: string[]) {
  const url = getUrl(value);
  if (!url) return null;
  if (!["https:", "http:"].includes(url.protocol)) return null;
  if (allowedHosts.length > 0 && !allowedHosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))) {
    return null;
  }
  return url.toString();
}

function getUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

import type { VideoProvider } from "@/types/database";
import { getVideoEmbedUrl, isDirectVideo } from "@/lib/video";

export function LessonPlayer({
  provider,
  videoUrl,
  embedCode,
  title
}: {
  provider: VideoProvider;
  videoUrl: string | null;
  embedCode: string | null;
  title: string;
}) {
  const src = getVideoEmbedUrl(provider, videoUrl, embedCode);

  if (!src) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
        <div>
          <p className="text-sm font-medium text-gray-900">Video ainda nao configurado</p>
          <p className="mt-1 text-sm text-gray-500">Adicione uma URL valida no admin para liberar o player.</p>
        </div>
      </div>
    );
  }

  if (isDirectVideo(provider)) {
    return (
      <video className="aspect-video w-full rounded-lg bg-black" controls preload="metadata">
        <source src={src} />
      </video>
    );
  }

  return (
    <iframe
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
      className="aspect-video w-full rounded-lg bg-black"
      referrerPolicy="strict-origin-when-cross-origin"
      src={src}
      title={title}
    />
  );
}

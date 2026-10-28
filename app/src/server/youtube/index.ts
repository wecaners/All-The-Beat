// YouTube 대표 영상 (F-16). 영상 검색은 하지 않고, 운영자가 붙여넣은 링크만 다룬다 (CON-5)

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

// youtu.be/ID, youtube.com/watch?v=ID, /shorts/ID, /embed/ID, /live/ID, ID 그대로
export function parseYouTubeVideoId(input: string): string | null {
  const text = input.trim();
  if (VIDEO_ID.test(text)) return text;

  let url: URL;
  try {
    url = new URL(text.startsWith("http") ? text : `https://${text}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www\.|m\.|music\.)/, "");
  let id: string | null = null;
  if (host === "youtu.be") id = url.pathname.split("/")[1] ?? null;
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    id = url.searchParams.get("v") ?? url.pathname.match(/^\/(?:shorts|embed|live)\/([^/?#]+)/)?.[1] ?? null;
  }
  return id && VIDEO_ID.test(id) ? id : null;
}

export type VideoInfo = { title: string; channel: string; thumbnailUrl: string | null };
export type VideoLookup = { ok: true; info: VideoInfo } | { ok: false; reason: "embed_blocked" | "not_found" | "unavailable" };

// oEmbed는 API 키 없이 제목·채널·썸네일을 주고, 퍼가기가 막힌 영상은 401로 답한다 (findings Technical Decisions)
export async function lookupVideo(videoId: string): Promise<VideoLookup> {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  let res: Response;
  try {
    res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watchUrl)}`, {
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    return { ok: false, reason: "unavailable" };
  }

  if (res.status === 401 || res.status === 403) return { ok: false, reason: "embed_blocked" };
  if (res.status === 400 || res.status === 404) return { ok: false, reason: "not_found" };
  if (!res.ok) return { ok: false, reason: "unavailable" };

  const body = (await res.json()) as { title?: string; author_name?: string; thumbnail_url?: string };
  return {
    ok: true,
    info: { title: body.title ?? "", channel: body.author_name ?? "", thumbnailUrl: body.thumbnail_url ?? null },
  };
}

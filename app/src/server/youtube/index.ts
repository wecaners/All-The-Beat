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

// 거절 이유를 사용자 문구로 (곡 대표 영상 F-16, 클래스 티저 F-25가 같이 쓴다)
export const VIDEO_ERROR = {
  not_youtube: "YouTube 영상 링크가 아니에요",
  embed_blocked: "다른 곳에 퍼가기가 막힌 영상이에요. 다른 영상을 골라 주세요",
  not_found: "영상을 찾을 수 없어요. 비공개이거나 삭제된 영상일 수 있어요",
  unavailable: "YouTube에서 영상 정보를 가져오지 못했어요. 잠시 후 다시 시도해 주세요",
} as const;

export class VideoError extends Error {
  constructor(readonly reason: keyof typeof VIDEO_ERROR) {
    super(VIDEO_ERROR[reason]);
  }
}

// 선택 입력용: 비어 있으면 null, 아니면 ID를 뽑고 퍼가기 가능한지 확인한다. 실패는 VideoError
export async function resolveVideoId(url: string | null | undefined): Promise<string | null> {
  const text = url?.trim();
  if (!text) return null;
  const videoId = parseYouTubeVideoId(text);
  if (!videoId) throw new VideoError("not_youtube");
  const lookup = await lookupVideo(videoId);
  if (!lookup.ok) throw new VideoError(lookup.reason);
  return videoId;
}


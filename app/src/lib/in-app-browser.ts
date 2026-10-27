export type InAppBrowser = "instagram" | "kakaotalk" | "facebook" | "naver" | "line" | null;

// User-Agent로 인앱 브라우저를 판별한다. 로그인 실패 시 "외부 브라우저로 열기" 안내에 쓴다 (08 문서 AR-1)
export function detectInAppBrowser(userAgent: string): InAppBrowser {
  const ua = userAgent.toLowerCase();
  if (ua.includes("instagram")) return "instagram";
  if (ua.includes("kakaotalk")) return "kakaotalk";
  if (ua.includes("fban") || ua.includes("fbav")) return "facebook";
  if (ua.includes("naver(inapp")) return "naver";
  if (ua.includes(" line/")) return "line";
  return null;
}

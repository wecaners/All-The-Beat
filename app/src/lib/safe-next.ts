// 로그인 후 돌아갈 경로는 우리 도메인 안의 상대 경로만 허용한다 (오픈 리다이렉트 방지, 08 문서 2.2)
export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  if (!next) return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

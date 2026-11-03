// 약관 동의 화면 주소 (specs/terms-consent). 브라우저와 서버가 같이 쓴다. 돌아갈 곳은 상대 경로만 (safeNextPath가 다시 거른다)
export function consentPath(next: string): string {
  return `/welcome?next=${encodeURIComponent(next)}`;
}

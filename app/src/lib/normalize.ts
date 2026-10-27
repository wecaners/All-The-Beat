// 검색 정규화 (09 ERD 5절). 저장(alias_norm)과 검색어 양쪽에 이 함수 하나만 쓴다
// "A2O LITE" → "a2olite", "에이투오 라이트" → "에이투오라이트", "NEON (Eng Ver.)" → "neonengver"
export function normalizeAlias(input: string): string {
  return input
    .normalize("NFKC") // 전각 문자·호환 문자를 보통 문자로
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, ""); // 글자·숫자만 남긴다 (공백·하이픈·따옴표·괄호 제거)
}

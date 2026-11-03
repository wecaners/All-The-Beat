import { and, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { profiles } from "@/db/schema";

// 약관 동의 (F-09, specs/terms-consent). 필수 둘(이용약관·개인정보)이 모두 있어야 동의한 것이다

export async function hasConsented(userId: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ terms: profiles.termsAgreedAt, privacy: profiles.privacyAgreedAt })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);
  return !!row?.terms && !!row.privacy;
}

// 필수 둘은 부르는 쪽(서버 액션)이 체크됐는지 확인한 뒤 부른다. 시각은 서버가 정하고, 이미 있으면 처음 시각을 지킨다.
// 선택(마케팅)은 이번에 고른 경우에만 채운다. 탈퇴한 프로필은 건드리지 않는다
export async function saveConsent(userId: string, input: { marketing: boolean }) {
  const now = sql`now()`;
  await getDb()
    .update(profiles)
    .set({
      termsAgreedAt: sql`coalesce(${profiles.termsAgreedAt}, ${now})`,
      privacyAgreedAt: sql`coalesce(${profiles.privacyAgreedAt}, ${now})`,
      marketingAgreedAt: input.marketing ? sql`coalesce(${profiles.marketingAgreedAt}, ${now})` : profiles.marketingAgreedAt,
    })
    .where(and(eq(profiles.id, userId), isNull(profiles.deletedAt)));
}

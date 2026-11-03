import { eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { classes, instructorProfiles, profiles } from "@/db/schema";

// 회원 탈퇴 (F-09, specs/account-withdrawal)

// 사용자에게 그대로 보여줄 수 있는 거절 사유
export class WithdrawError extends Error {}

// 로그인 계정(auth.users)을 지운다. FK가 나머지를 정리한다:
// profiles → requests·encores·user_visits는 같이 삭제, events·songs.created_by·instructor_profiles.user_id는 NULL
// 강사면 같은 트랜잭션에서 클래스를 숨기고 정지한다(user_id가 NULL이 돼도 승인 상태면 공개가 유지되므로)
export async function withdraw(userId: string): Promise<void> {
  const kakaoId = await getDb().transaction(async (tx) => {
    const [me] = await tx.select({ role: profiles.role }).from(profiles).where(eq(profiles.id, userId)).limit(1);
    if (me?.role === "admin") throw new WithdrawError("운영자 계정은 탈퇴할 수 없어요");

    const [identity] = (await tx.execute(
      sql`select provider_id from auth.identities where user_id = ${userId}::uuid and provider = 'kakao' limit 1`,
    )) as unknown as { provider_id: string }[];

    const mine = tx.select({ id: instructorProfiles.id }).from(instructorProfiles).where(eq(instructorProfiles.userId, userId));
    await tx.update(classes).set({ isHidden: true, updatedAt: sql`now()` }).where(inArray(classes.instructorId, mine));
    await tx.update(instructorProfiles).set({ status: "suspended" }).where(eq(instructorProfiles.userId, userId));

    const deleted = (await tx.execute(sql`delete from auth.users where id = ${userId}::uuid returning id`)) as unknown as unknown[];
    if (deleted.length === 0) throw new WithdrawError("이미 탈퇴했거나 없는 계정이에요");
    return identity?.provider_id ?? null;
  });

  // 정보를 지운 뒤에 카카오 연결을 끊는다. 실패해도 탈퇴는 되돌리지 않는다 (FR-6)
  if (kakaoId && !(await unlinkKakao(kakaoId))) {
    // 운영자가 카카오 콘솔에서 따로 끊을 수 있게 회원번호만 남긴다 (CON-2)
    console.error(`[withdraw] 카카오 연결 끊기 실패 · 회원번호 ${kakaoId}`);
  }
}

// 카카오 연결 끊기 (어드민 키). 카카오 로그인 문서: 탈퇴 과정에 반드시 포함
export async function unlinkKakao(kakaoId: string): Promise<boolean> {
  const key = process.env.KAKAO_ADMIN_KEY;
  if (!key) {
    console.error("[unlinkKakao] KAKAO_ADMIN_KEY가 없습니다");
    return false;
  }
  try {
    const res = await fetch("https://kapi.kakao.com/v1/user/unlink", {
      method: "POST",
      headers: { Authorization: `KakaoAK ${key}`, "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
      body: new URLSearchParams({ target_id_type: "user_id", target_id: kakaoId }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.error(`[unlinkKakao] 카카오 응답 ${res.status}`);
    return res.ok;
  } catch (e) {
    console.error("[unlinkKakao]", e);
    return false;
  }
}

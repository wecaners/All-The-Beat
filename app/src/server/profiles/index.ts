import { eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { profiles } from "@/db/schema";

// 카카오 닉네임이 비어 오는 경우(동의 철회 등)에 쓰는 이름
const FALLBACK_NICKNAME = "올빗 사용자";

export type Profile = typeof profiles.$inferSelect;

// Supabase Auth가 카카오 정보를 user_metadata에 담아준다. 이메일은 받아도 profiles에 옮기지 않는다 (03 명세 F-09)
export function profileFromAuthMetadata(metadata: Record<string, unknown>) {
  const pick = (...keys: string[]) => {
    for (const key of keys) {
      const value = metadata[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    return null;
  };

  return {
    nickname: pick("name", "full_name", "preferred_username", "user_name") ?? FALLBACK_NICKNAME,
    avatarUrl: pick("avatar_url", "picture"),
  };
}

// 로그인할 때마다 호출한다. 처음이면 만들고, 이후에는 카카오 닉네임·사진을 최신으로 맞춘다.
// 탈퇴한 프로필(deleted_at)은 익명화된 상태를 유지하도록 건드리지 않는다
export async function upsertProfileOnLogin(userId: string, metadata: Record<string, unknown>) {
  const values = profileFromAuthMetadata(metadata);

  await getDb()
    .insert(profiles)
    .values({ id: userId, ...values })
    .onConflictDoUpdate({
      target: profiles.id,
      set: values,
      setWhere: isNull(profiles.deletedAt),
    });
}

// 이 기능 전에 로그인해 프로필이 없는 사용자도 추가요할 수 있게, 없을 때만 만든다
export async function ensureProfile(userId: string, metadata: Record<string, unknown>) {
  await getDb()
    .insert(profiles)
    .values({ id: userId, ...profileFromAuthMetadata(metadata) })
    .onConflictDoNothing({ target: profiles.id });
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const [row] = await getDb().select().from(profiles).where(eq(profiles.id, userId)).limit(1);
  return row ?? null;
}

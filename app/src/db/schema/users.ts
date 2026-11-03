import { sql } from "drizzle-orm";
import { bigint, boolean, check, index, pgTable, primaryKey, smallint, text, uuid } from "drizzle-orm/pg-core";
import { authUsers } from "drizzle-orm/supabase";
import { createdAt, timestamptz } from "./columns";
import { instructorStatus, memberRole } from "./enums";
import { regions } from "./regions";

// 우리 서비스의 사용자. Supabase Auth 사용자와 1:1 (Auth는 로그인 식별만, 07 문서 T-2)
export const profiles = pgTable("profiles", {
  id: uuid()
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  nickname: text().notNull(), // 카카오 닉네임
  avatarUrl: text(), // 카카오 프로필 이미지 (선택 동의)
  role: memberRole().notNull().default("member"),
  termsAgreedAt: timestamptz(), // NULL이면 동의 시트 표시
  privacyAgreedAt: timestamptz(),
  marketingAgreedAt: timestamptz(),
  deletedAt: timestamptz(), // 탈퇴 (F-09)
  createdAt: createdAt(),
}).enableRLS();

// 강사. 직접 신청 또는 운영자 대리 생성 (F-15, F-19)
export const instructorProfiles = pgTable(
  "instructor_profiles",
  {
    id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    userId: uuid()
      .unique()
      .references(() => profiles.id, { onDelete: "set null" }), // 대리 등록(미연결)이면 NULL
    displayName: text().notNull(),
    instagramHandle: text().notNull().unique(), // 소문자, @ 제외
    bio: text(),
    // 강사 섹션 (specs/instructor-studio). 사진은 Storage 버킷 media의 경로
    photoPath: text(),
    photoThumbPath: text(),
    portfolioVideoIds: text().array().notNull().default(sql`'{}'::text[]`), // YouTube id, 최대 2
    mediaConsent: boolean().notNull().default(false), // 대리 등록 강사의 사진·영상·소개 게재 동의
    status: instructorStatus().notNull().default("pending"),
    isProxy: boolean().notNull().default(false),
    consentAt: timestamptz(), // 대리 등록 게재 동의. NULL이면 그 강사 클래스 공개 불가
    consentNote: text(),
    verifyCodeHash: text(), // 원문 저장 안 함
    verifyCodeExpiresAt: timestamptz(),
    approvedAt: timestamptz(),
    rejectedReason: text(),
    // 대리 강사 가져오기 신청 (F-19, specs/instructor-claim). 코드는 verifyCode* 칸을 같이 쓴다. 확인되면 userId로 옮기고 비운다
    claimUserId: uuid()
      .unique()
      .references(() => profiles.id, { onDelete: "set null" }),
    claimRequestedAt: timestamptz(),
    createdAt: createdAt(),
  },
  (t) => [
    check("instructor_profiles_handle_lower", sql`${t.instagramHandle} = lower(${t.instagramHandle}) and ${t.instagramHandle} !~ '^@'`),
    check("instructor_profiles_bio_len", sql`char_length(${t.bio}) <= 50`),
    check("instructor_profiles_portfolio_max", sql`cardinality(${t.portfolioVideoIds}) <= 2`),
    index("instructor_profiles_display_name_trgm").using("gin", t.displayName.op("gin_trgm_ops")),
  ],
).enableRLS();

export const instructorRegions = pgTable(
  "instructor_regions",
  {
    instructorId: bigint({ mode: "number" })
      .notNull()
      .references(() => instructorProfiles.id, { onDelete: "cascade" }),
    regionId: smallint()
      .notNull()
      .references(() => regions.id),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.instructorId, t.regionId] })],
).enableRLS();

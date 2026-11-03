import { sql } from "drizzle-orm";
import { bigint, check, date, index, integer, pgTable, primaryKey, smallint, text, unique, uuid } from "drizzle-orm/pg-core";
import { classes } from "./classes";
import { createdAt, timestamptz, updatedAt } from "./columns";
import { encoreRoundStatus, eventType, requestStatus, timePref } from "./enums";
import { regions } from "./regions";
import { songs } from "./songs";
import { profiles } from "./users";

// 추가요 (F-07). 사용자 × 곡 = 1건. 취소 후 다시 하면 같은 행을 waiting으로
export const requests = pgTable(
  "requests",
  {
    id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    userId: uuid()
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    songId: bigint({ mode: "number" })
      .notNull()
      .references(() => songs.id),
    regionId: smallint().references(() => regions.id), // NULL = 어디든 좋아요
    timePref: timePref().notNull().default("any"),
    message: text(), // 강사·운영자만 열람
    status: requestStatus().notNull().default("waiting"),
    fulfilledClassId: bigint({ mode: "number" }).references(() => classes.id, { onDelete: "set null" }),
    canceledAt: timestamptz(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique().on(t.userId, t.songId),
    check("requests_message_len", sql`char_length(${t.message}) <= 100`),
    index("requests_song_created_idx").on(t.songId, t.createdAt).where(sql`${t.status} <> 'canceled'`),
    index("requests_region_created_idx").on(t.regionId, t.createdAt),
    index("requests_user_idx").on(t.userId),
  ],
).enableRLS();

// 앵콜 (F-24). 다시 앵콜하면 canceled_at을 NULL로. 현재 인원은 저장하지 않고 여기서 센다
export const encores = pgTable(
  "encores",
  {
    id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    userId: uuid()
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    classId: bigint({ mode: "number" })
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    timePref: timePref().notNull().default("any"),
    message: text(),
    canceledAt: timestamptz(), // NULL이면 유효
    createdAt: createdAt(),
  },
  (t) => [
    unique().on(t.userId, t.classId),
    check("encores_message_len", sql`char_length(${t.message}) <= 100`),
    index("encores_active_class_idx").on(t.classId).where(sql`${t.canceledAt} is null`),
    index("encores_user_idx").on(t.userId),
  ],
).enableRLS();

// 클래스별 앵콜 진행 (S-4). 상태는 뒤로 가지 않는다
export const encoreRounds = pgTable(
  "encore_rounds",
  {
    classId: bigint({ mode: "number" })
      .primaryKey()
      .references(() => classes.id, { onDelete: "cascade" }),
    threshold: smallint().notNull(), // 정원 30%(최소 3), 정원 없으면 5. 생성 시 고정
    status: encoreRoundStatus().notNull().default("collecting"),
    reachedAt: timestamptz(),
    reviewingAt: timestamptz(),
    countAtReview: integer(), // 검토 시작 시점 인원 (강사 화면 기준점)
    respondedAt: timestamptz(),
    encoreClassId: bigint({ mode: "number" })
      .unique()
      .references(() => classes.id, { onDelete: "set null" }),
    expiresAt: timestamptz().notNull(), // 원 클래스 종료 + 30일
    createdAt: createdAt(),
  },
  (t) => [
    check("encore_rounds_threshold_pos", sql`${t.threshold} > 0`),
    index("encore_rounds_status_expires_idx").on(t.status, t.expiresAt),
  ],
).enableRLS();

// 조회·예약 클릭·검색 (F-06, F-18). IP·기기 정보는 저장하지 않는다
export const events = pgTable(
  "events",
  {
    id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    type: eventType().notNull(),
    songId: bigint({ mode: "number" }).references(() => songs.id, { onDelete: "set null" }),
    classId: bigint({ mode: "number" }).references(() => classes.id, { onDelete: "set null" }),
    userId: uuid().references(() => profiles.id, { onDelete: "set null" }),
    sessionId: text().notNull(), // 비로그인 중복 제거용 쿠키 값
    referrer: text(),
    query: text(), // search일 때 검색어
    createdAt: createdAt(),
  },
  (t) => [
    index("events_type_class_created_idx").on(t.type, t.classId, t.createdAt),
    index("events_type_song_created_idx").on(t.type, t.songId, t.createdAt),
  ],
).enableRLS();

// 찜 (F-22). 사용자 × 클래스 = 1행. 빼면 지운다 (취소 시각 없음)
export const favorites = pgTable(
  "favorites",
  {
    userId: uuid()
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    classId: bigint({ mode: "number" })
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.classId] })],
).enableRLS();

// 로그인 사용자의 접속 날짜 (F-18 재방문). 사용자 × KST 날짜 = 1행. 방문한 주소·IP·기기는 남기지 않는다
export const userVisits = pgTable(
  "user_visits",
  {
    userId: uuid()
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    visitedOn: date({ mode: "string" }).notNull(), // KST 날짜
  },
  (t) => [primaryKey({ columns: [t.userId, t.visitedOn] })],
).enableRLS();

import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  bigint,
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  pgTable,
  primaryKey,
  smallint,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createdAt, timestamptz, updatedAt } from "./columns";
import { bookingType, classLevel, classStatus } from "./enums";
import { regions } from "./regions";
import { songs } from "./songs";
import { instructorProfiles } from "./users";

// 강사의 스튜디오 ("이전 장소" 재사용 T-02 → 내 스튜디오, specs/instructor-studio)
export const instructorPlaces = pgTable(
  "instructor_places",
  {
    id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    instructorId: bigint({ mode: "number" })
      .notNull()
      .references(() => instructorProfiles.id, { onDelete: "cascade" }),
    studioName: text().notNull(),
    address: text().notNull(),
    sigungu: text(), // 권역 매핑용
    bname: text(),
    regionId: smallint()
      .notNull()
      .references(() => regions.id),
    // 카카오 로컬 API 검색 결과에서 고를 때 한 번 저장한다. 주소로 고르면 장소 id·링크는 없다
    kakaoPlaceId: text(),
    kakaoPlaceUrl: text(),
    lat: doublePrecision(),
    lng: doublePrecision(),
    facilities: text().array().notNull().default(sql`'{}'::text[]`), // src/server/admin/studios.ts FACILITIES
    archivedAt: timestamptz(), // 목록에서 빼기. 지난 클래스가 가리키므로 지우지 않는다
    lastUsedAt: timestamptz(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("instructor_places_kakao_uq").on(t.instructorId, t.kakaoPlaceId).where(sql`${t.kakaoPlaceId} is not null`),
    check("instructor_places_latlng_pair", sql`(${t.lat} is null) = (${t.lng} is null)`),
  ],
).enableRLS();

// 스튜디오 사진. 파일은 Storage 버킷 media, 화면용 큰 사진과 목록용 작은 사진 두 장 (최대 8장은 서버가 지킨다)
export const studioPhotos = pgTable(
  "studio_photos",
  {
    id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    placeId: bigint({ mode: "number" })
      .notNull()
      .references(() => instructorPlaces.id, { onDelete: "cascade" }),
    path: text().notNull(),
    thumbPath: text().notNull(),
    position: smallint().notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("studio_photos_place_idx").on(t.placeId, t.position)],
).enableRLS();

export const classes = pgTable(
  "classes",
  {
    id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(), // URL /class/{id}, /go/{id}
    instructorId: bigint({ mode: "number" })
      .notNull()
      .references(() => instructorProfiles.id),
    title: text().notNull(), // 비우면 서버가 "{곡명} 원데이 클래스"로 채움
    startsAt: timestamptz().notNull(),
    endsAt: timestamptz().notNull(),
    // 장소 스냅샷: 저장 장소가 바뀌어도 지난 클래스 기록은 그대로
    studioName: text().notNull(),
    address: text().notNull(),
    placeId: bigint({ mode: "number" }).references(() => instructorPlaces.id, { onDelete: "set null" }),
    regionId: smallint()
      .notNull()
      .references(() => regions.id),
    price: integer().notNull(), // 0 = 무료
    level: classLevel().notNull(),
    capacity: smallint(),
    bookingUrl: text().notNull(),
    bookingType: bookingType().notNull(),
    thumbnailPath: text(), // Storage 경로
    description: text(),
    teaserVideoId: text(), // F-25 (Should)
    status: classStatus().notNull().default("open"),
    cancelReason: text(),
    isHidden: boolean().notNull().default(false), // 운영자 숨김 (상태와 별개)
    createdByAdmin: boolean().notNull().default(false),
    fromRequest: boolean().notNull().default(false), // 요청→개설 지표
    encoreOfClassId: bigint({ mode: "number" }).references((): AnyPgColumn => classes.id, { onDelete: "set null" }),
    scheduleChangedAt: timestamptz(), // "변경됨" 배지 24시간
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("classes_time_order", sql`${t.endsAt} > ${t.startsAt}`),
    check("classes_price_nonneg", sql`${t.price} >= 0`),
    check("classes_capacity_pos", sql`${t.capacity} > 0`),
    check("classes_booking_url_http", sql`${t.bookingUrl} ~* '^https?://'`),
    check("classes_description_len", sql`char_length(${t.description}) <= 1000`),
    index("classes_status_starts_at_idx").on(t.status, t.startsAt).where(sql`not ${t.isHidden}`),
    index("classes_region_starts_at_idx").on(t.regionId, t.startsAt),
    index("classes_instructor_starts_at_idx").on(t.instructorId, t.startsAt.desc()),
  ],
).enableRLS();

// 클래스에서 배우는 곡 1~3개
export const classSongs = pgTable(
  "class_songs",
  {
    classId: bigint({ mode: "number" })
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    songId: bigint({ mode: "number" })
      .notNull()
      .references(() => songs.id),
    position: smallint().notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.classId, t.songId] }),
    check("class_songs_position_range", sql`${t.position} between 1 and 3`),
    index("class_songs_song_idx").on(t.songId),
  ],
).enableRLS();

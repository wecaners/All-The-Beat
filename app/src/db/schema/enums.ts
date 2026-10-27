import { pgEnum } from "drizzle-orm/pg-core";

// 09 ERD 2절. 값을 바꾸면 마이그레이션이 필요하다 (Postgres enum은 값 삭제가 어렵다)

export const memberRole = pgEnum("member_role", ["member", "admin"]);

// S-3. 대리 등록(미연결)은 is_proxy=true + user_id NULL로 표현
export const instructorStatus = pgEnum("instructor_status", ["pending", "verified", "approved", "rejected", "suspended"]);

export const reviewStatus = pgEnum("review_status", ["pending", "confirmed"]);

export const videoType = pgEnum("video_type", ["dance_practice", "performance", "mv"]);

// 입문 / 초급 / 중급 이상
export const classLevel = pgEnum("class_level", ["intro", "beginner", "intermediate_plus"]);

export const bookingType = pgEnum("booking_type", ["naver", "kakao_openchat", "insta_dm", "google_form", "other"]);

// S-1
export const classStatus = pgEnum("class_status", ["open", "closing_soon", "closed", "ended", "canceled"]);

export const timePref = pgEnum("time_pref", ["weekday_evening", "weekend_day", "weekend_evening", "any"]);

// S-2
export const requestStatus = pgEnum("request_status", ["waiting", "opened", "canceled"]);

// S-4. 상태는 뒤로 가지 않는다 (src/server/encores에서 전이 검사)
export const encoreRoundStatus = pgEnum("encore_round_status", [
  "collecting",
  "delivered",
  "reviewing",
  "opened",
  "declined",
  "expired",
]);

export const eventType = pgEnum("event_type", ["song_view", "class_view", "booking_click", "search"]);

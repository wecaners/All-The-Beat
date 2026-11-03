import { and, asc, count, eq, gt, gte, inArray, lt, or, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { artists, classes, classLevel, classSongs, instructorProfiles, regions, songs } from "@/db/schema";
import { activeEncoreCount } from "@/server/encores";
import { visibleVideoId } from "@/server/songs";
import { matchSongIds } from "@/server/songs/search";
import { publiclyVisible } from "./index";

// 클래스 목록·필터 (F-03, specs/class-list). 조건은 전부 주소에 있고, 20개씩 커서로 이어 본다

export const PAGE_SIZE = 20;
export const DATE_PRESETS = ["today", "week", "weekend"] as const;
export const LEVELS = classLevel.enumValues;

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export type ClassListQuery = {
  q: string;
  /** 오늘 / 이번 주 / 이번 주말 / 직접 고른 날(YYYY-MM-DD) / 전체(null) */
  date: (typeof DATE_PRESETS)[number] | string | null;
  region: number[];
  level: (typeof LEVELS)[number] | null;
  /** 마감(closed) 클래스도 보기 */
  closed: boolean;
};

// 주소 → 조건. 모르는 값은 무시한다 (FR-11)
export function parseClassListQuery(params: URLSearchParams): ClassListQuery {
  const date = params.get("date");
  const level = params.get("level");
  const region = [...new Set((params.get("region") ?? "").split(",").map(Number).filter((n) => Number.isInteger(n) && n > 0))];
  return {
    q: (params.get("q") ?? "").slice(0, 50).trim(),
    // 2026-02-30 같은 날은 Date가 3월로 넘겨 버려서, 되돌려 같은 문자열인지 본다
    date: date && ((DATE_PRESETS as readonly string[]).includes(date) || isRealYmd(date)) ? date : null,
    region,
    level: level && (LEVELS as readonly string[]).includes(level) ? (level as ClassListQuery["level"]) : null,
    closed: params.get("closed") === "1",
  };
}

// 조건 → 주소. 기본값은 쓰지 않아 주소가 짧다
export function classListSearch(query: ClassListQuery): string {
  const p = new URLSearchParams();
  if (query.q) p.set("q", query.q);
  if (query.date) p.set("date", query.date);
  if (query.region.length) p.set("region", query.region.join(","));
  if (query.level) p.set("level", query.level);
  if (query.closed) p.set("closed", "1");
  const s = p.toString();
  return s ? `?${s}` : "";
}

// KST는 UTC+9 고정(서머타임 없음)이라 날짜 경계를 문자열로 만든다
const kstYmd = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const kstStart = (ymd: string) => new Date(`${ymd}T00:00:00+09:00`);
const addDays = (ymd: string, n: number) => kstYmd(new Date(kstStart(ymd).getTime() + n * 86_400_000 + 43_200_000));
const weekdayOf = (ymd: string) => new Date(`${ymd}T12:00:00+09:00`).getUTCDay(); // 0 = 일
// 2026-13-01은 Date가 못 읽고, 2026-02-30은 3월로 넘겨 버린다. 되돌려 같은 문자열일 때만 진짜 날이다
const isRealYmd = (ymd: string) => YMD.test(ymd) && !Number.isNaN(kstStart(ymd).getTime()) && kstYmd(kstStart(ymd)) === ymd;

// 날짜 조건의 시작·끝(끝은 포함 안 함). 이번 주는 오늘~일요일, 이번 주말은 다가오는 토·일(일요일이면 오늘) (FR-7)
export function dateRange(date: ClassListQuery["date"], now = new Date()): { from: Date; to: Date } | null {
  if (!date) return null;
  const today = kstYmd(now);
  if (date === "today") return { from: kstStart(today), to: kstStart(addDays(today, 1)) };
  if (date === "week") return { from: kstStart(today), to: kstStart(addDays(today, ((7 - weekdayOf(today)) % 7) + 1)) };
  if (date === "weekend") {
    const wd = weekdayOf(today);
    if (wd === 0) return { from: kstStart(today), to: kstStart(addDays(today, 1)) };
    const sat = addDays(today, 6 - wd);
    return { from: kstStart(sat), to: kstStart(addDays(sat, 2)) };
  }
  return { from: kstStart(date), to: kstStart(addDays(date, 1)) };
}

export type ClassListItem = {
  id: number;
  startsAt: Date;
  endsAt: Date;
  regionName: string;
  instructorName: string;
  price: number;
  level: (typeof LEVELS)[number];
  status: "open" | "closing_soon" | "closed";
  /** 대표 곡 (position 1) */
  songTitle: string;
  artistName: string;
  videoId: string | null;
  /** 취소되지 않은 앵콜 수 (마감 카드에 보여준다) */
  encoreCount: number;
};

// 커서는 마지막 항목의 시작 시각(밀리초)과 id. timestamptz는 마이크로초라 비교·정렬 모두 밀리초로 자른다 (겹침·빠짐 방지)
export const classCursor = z.object({ startsAt: z.string().datetime({ offset: true }), id: z.number().int().positive() });
export type ClassCursor = z.infer<typeof classCursor>;
const startsMs = sql`date_trunc('milliseconds', ${classes.startsAt})`;

async function whereOf(query: ClassListQuery) {
  const range = dateRange(query.date);
  let songFilter: ReturnType<typeof inArray> | undefined;
  if (query.q) {
    const ids = [...(await matchSongIds(query.q)).keys()];
    if (ids.length === 0) return null; // 걸리는 곡이 없으면 결과도 없다
    songFilter = inArray(classes.id, getDb().select({ id: classSongs.classId }).from(classSongs).where(inArray(classSongs.songId, ids)));
  }
  return and(
    inArray(classes.status, query.closed ? ["open", "closing_soon", "closed"] : ["open", "closing_soon"]),
    gt(classes.startsAt, sql`now()`),
    publiclyVisible,
    range ? and(gte(classes.startsAt, range.from), lt(classes.startsAt, range.to)) : undefined,
    query.region.length ? inArray(classes.regionId, query.region) : undefined,
    query.level ? eq(classes.level, query.level) : undefined,
    songFilter,
  );
}

export async function listClasses(query: ClassListQuery, cursor: ClassCursor | null = null, limit = PAGE_SIZE): Promise<{ items: ClassListItem[]; nextCursor: ClassCursor | null }> {
  const where = await whereOf(query);
  if (!where) return { items: [], nextCursor: null };
  const after = cursor
    ? or(gt(startsMs, sql`${cursor.startsAt}::timestamptz`), and(eq(startsMs, sql`${cursor.startsAt}::timestamptz`), gt(classes.id, cursor.id)))
    : undefined;

  const rows = await getDb()
    .select({
      id: classes.id,
      startsAt: classes.startsAt,
      endsAt: classes.endsAt,
      regionName: regions.shortName,
      instructorName: instructorProfiles.displayName,
      price: classes.price,
      level: classes.level,
      status: classes.status,
      songTitle: songs.title,
      artistName: artists.name,
      videoId: visibleVideoId,
      encoreCount: activeEncoreCount(classes.id),
    })
    .from(classes)
    .innerJoin(instructorProfiles, eq(instructorProfiles.id, classes.instructorId))
    .innerJoin(regions, eq(regions.id, classes.regionId))
    .innerJoin(classSongs, and(eq(classSongs.classId, classes.id), eq(classSongs.position, 1)))
    .innerJoin(songs, eq(songs.id, classSongs.songId))
    .innerJoin(artists, eq(artists.id, songs.artistId))
    .where(and(where, after))
    .orderBy(asc(startsMs), asc(classes.id))
    .limit(limit + 1);

  const items = rows.slice(0, limit) as ClassListItem[];
  const last = items[items.length - 1];
  return { items, nextCursor: rows.length > limit && last ? { startsAt: last.startsAt.toISOString(), id: last.id } : null };
}

// "N개 클래스"
export async function countClasses(query: ClassListQuery): Promise<number> {
  const where = await whereOf(query);
  if (!where) return 0;
  const [{ n }] = await getDb()
    .select({ n: count() })
    .from(classes)
    .innerJoin(instructorProfiles, eq(instructorProfiles.id, classes.instructorId))
    .where(where);
  return n;
}

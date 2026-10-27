import { and, asc, eq, gt, inArray, isNotNull, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { classes, classSongs, instructorProfiles, regions } from "@/db/schema";

export type ClassCard = {
  id: number;
  title: string;
  startsAt: Date;
  endsAt: Date;
  regionName: string;
  price: number;
  level: "intro" | "beginner" | "intermediate_plus";
  status: "open" | "closing_soon";
  instructorName: string;
};

// 수강생에게 보여도 되는 클래스: 숨김 아님 + 승인된 강사 + 대리 등록이면 게재 동의 있음 (F-15)
const publiclyVisible = and(
  eq(classes.isHidden, false),
  eq(instructorProfiles.status, "approved"),
  or(eq(instructorProfiles.isProxy, false), isNotNull(instructorProfiles.consentAt)),
);

// 곡 상세의 "다가오는 클래스" (F-04): 모집중·마감 임박, 날짜 가까운 순
export async function listUpcomingClassesForSong(songId: number, limit = 20): Promise<ClassCard[]> {
  const rows = await getDb()
    .select({
      id: classes.id,
      title: classes.title,
      startsAt: classes.startsAt,
      endsAt: classes.endsAt,
      regionName: regions.shortName,
      price: classes.price,
      level: classes.level,
      status: classes.status,
      instructorName: instructorProfiles.displayName,
    })
    .from(classSongs)
    .innerJoin(classes, eq(classes.id, classSongs.classId))
    .innerJoin(instructorProfiles, eq(instructorProfiles.id, classes.instructorId))
    .innerJoin(regions, eq(regions.id, classes.regionId))
    .where(
      and(
        eq(classSongs.songId, songId),
        inArray(classes.status, ["open", "closing_soon"]),
        gt(classes.startsAt, sql`now()`),
        publiclyVisible,
      ),
    )
    .orderBy(asc(classes.startsAt))
    .limit(limit);

  return rows as ClassCard[];
}

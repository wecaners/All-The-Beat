import { and, asc, count, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { instructorPlaces, instructorProfiles, regions, studioPhotos } from "@/db/schema";
import { FACILITIES, type Facility, isFacility } from "@/lib/facilities";
import { checkImage, extensionOf, type MediaStore, mediaUrl } from "@/server/media";
import { lookupVideo, parseYouTubeVideoId } from "@/server/youtube";
import { guessRegion } from "./classes";
import { AdminInputError, isUniqueViolation } from "./shared";

const facilityKeys = Object.keys(FACILITIES) as [Facility, ...Facility[]];

const MAX_STUDIO_PHOTOS = 8;

// 운영자가 카카오 검색 결과에서 고른 값. 운영자만 부르지만 범위는 다시 확인한다 (한국 안의 좌표, 카카오 장소 링크)
export const studioCandidateInput = z.object({
  instructorId: z.number().int().positive(),
  name: z.string().trim().min(1, "스튜디오 이름을 넣어 주세요").max(60, "스튜디오 이름은 60자까지예요"),
  address: z.string().trim().min(1).max(200),
  lat: z.number().min(33).max(39),
  lng: z.number().min(124).max(132),
  kakaoPlaceId: z.string().regex(/^\d{1,20}$/).nullable(),
  kakaoPlaceUrl: z
    .string()
    .regex(/^https?:\/\/place\.map\.kakao\.com\/\d+$/)
    .nullable(),
});

export const studioUpdateInput = z.object({
  placeId: z.number().int().positive(),
  studioName: z.string().trim().min(1, "스튜디오 이름을 넣어 주세요").max(60, "스튜디오 이름은 60자까지예요"),
  regionId: z.number().int().positive(),
  facilities: z.array(z.enum(facilityKeys)).max(facilityKeys.length),
});

export const profileInput = z.object({
  instructorId: z.number().int().positive(),
  bio: z
    .string()
    .trim()
    .max(50, "소개는 50자까지예요")
    .transform((v) => v || null),
  portfolioUrls: z.array(z.string().trim()).max(2, "포트폴리오 영상은 2개까지예요"),
  mediaConsent: z.boolean(),
});

export type AdminStudio = {
  id: number;
  studioName: string;
  address: string;
  regionId: number;
  regionName: string;
  facilities: Facility[];
  hasLocation: boolean;
  kakaoPlaceUrl: string | null;
  archived: boolean;
  photos: { id: number; thumbUrl: string }[];
};

export type AdminInstructorMedia = {
  bio: string | null;
  portfolioVideoIds: string[];
  mediaConsent: boolean;
  photoThumbUrl: string | null;
};

async function assertInstructor(instructorId: number) {
  const [row] = await getDb().select({ id: instructorProfiles.id }).from(instructorProfiles).where(eq(instructorProfiles.id, instructorId)).limit(1);
  if (!row) throw new AdminInputError("없는 강사예요");
}

async function assertPlace(placeId: number) {
  const [row] = await getDb().select({ id: instructorPlaces.id }).from(instructorPlaces).where(eq(instructorPlaces.id, placeId)).limit(1);
  if (!row) throw new AdminInputError("없는 스튜디오예요");
}

export async function listStudiosForAdmin(instructorId: number): Promise<AdminStudio[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: instructorPlaces.id,
      studioName: instructorPlaces.studioName,
      address: instructorPlaces.address,
      regionId: instructorPlaces.regionId,
      regionName: regions.shortName,
      facilities: instructorPlaces.facilities,
      lat: instructorPlaces.lat,
      kakaoPlaceUrl: instructorPlaces.kakaoPlaceUrl,
      archivedAt: instructorPlaces.archivedAt,
    })
    .from(instructorPlaces)
    .innerJoin(regions, eq(regions.id, instructorPlaces.regionId))
    .where(eq(instructorPlaces.instructorId, instructorId))
    .orderBy(asc(instructorPlaces.archivedAt), asc(instructorPlaces.id));
  if (rows.length === 0) return [];

  const photos = await db
    .select({ id: studioPhotos.id, placeId: studioPhotos.placeId, thumbPath: studioPhotos.thumbPath })
    .from(studioPhotos)
    .innerJoin(instructorPlaces, eq(instructorPlaces.id, studioPhotos.placeId))
    .where(eq(instructorPlaces.instructorId, instructorId))
    .orderBy(asc(studioPhotos.position), asc(studioPhotos.id));

  return rows.map((r) => ({
    id: r.id,
    studioName: r.studioName,
    address: r.address,
    regionId: r.regionId,
    regionName: r.regionName,
    facilities: r.facilities.filter(isFacility),
    hasLocation: r.lat !== null,
    kakaoPlaceUrl: r.kakaoPlaceUrl,
    archived: r.archivedAt !== null,
    photos: photos.filter((p) => p.placeId === r.id).map((p) => ({ id: p.id, thumbUrl: mediaUrl(p.thumbPath) })),
  }));
}

// 고른 후보로 스튜디오를 만든다. 같은 강사의 같은 카카오 장소면 이미 있는 것을 쓴다 (FR-2)
export async function saveStudio(raw: z.input<typeof studioCandidateInput>): Promise<{ id: number; existed: boolean }> {
  const input = studioCandidateInput.parse(raw);
  await assertInstructor(input.instructorId);
  const db = getDb();

  const findSame = async () => {
    if (!input.kakaoPlaceId) return null;
    const [row] = await db
      .select({ id: instructorPlaces.id })
      .from(instructorPlaces)
      .where(and(eq(instructorPlaces.instructorId, input.instructorId), eq(instructorPlaces.kakaoPlaceId, input.kakaoPlaceId)))
      .limit(1);
    return row ?? null;
  };

  const same = await findSame();
  if (same) {
    await db.update(instructorPlaces).set({ archivedAt: null }).where(eq(instructorPlaces.id, same.id));
    return { id: same.id, existed: true };
  }

  const guessed = await guessRegion(db, input.address);
  try {
    const [created] = await db
      .insert(instructorPlaces)
      .values({
        instructorId: input.instructorId,
        studioName: input.name,
        address: input.address,
        sigungu: guessed.sigungu,
        regionId: guessed.regionId,
        kakaoPlaceId: input.kakaoPlaceId,
        kakaoPlaceUrl: input.kakaoPlaceUrl,
        lat: input.lat,
        lng: input.lng,
      })
      .returning({ id: instructorPlaces.id });
    return { id: created.id, existed: false };
  } catch (e) {
    // 동시에 같은 장소를 두 번 저장한 경우
    if (isUniqueViolation(e)) {
      const again = await findSame();
      if (again) return { id: again.id, existed: true };
    }
    throw e;
  }
}

export async function updateStudio(raw: z.input<typeof studioUpdateInput>) {
  const input = studioUpdateInput.parse(raw);
  await assertPlace(input.placeId);
  const [region] = await getDb().select({ id: regions.id }).from(regions).where(eq(regions.id, input.regionId)).limit(1);
  if (!region) throw new AdminInputError("없는 권역이에요");
  await getDb()
    .update(instructorPlaces)
    .set({ studioName: input.studioName, regionId: input.regionId, facilities: [...new Set(input.facilities)] })
    .where(eq(instructorPlaces.id, input.placeId));
}

// 목록에서 빼기·되돌리기. 지난 클래스가 가리키므로 지우지 않는다 (FR-6)
export async function setStudioArchived(placeId: number, archived: boolean) {
  await assertPlace(placeId);
  await getDb()
    .update(instructorPlaces)
    .set({ archivedAt: archived ? new Date() : null })
    .where(eq(instructorPlaces.id, placeId));
}

function photoPaths(prefix: string, full: File, thumb: File) {
  const key = crypto.randomUUID();
  return { path: `${prefix}/${key}.${extensionOf(full.type)}`, thumbPath: `${prefix}/${key}_t.${extensionOf(thumb.type)}` };
}

async function uploadPair(store: MediaStore, paths: { path: string; thumbPath: string }, full: File, thumb: File) {
  await store.upload(paths.path, full, full.type);
  try {
    await store.upload(paths.thumbPath, thumb, thumb.type);
  } catch (e) {
    await store.remove([paths.path]).catch(() => {});
    throw e;
  }
}

export async function addStudioPhoto(store: MediaStore, placeId: number, full: unknown, thumb: unknown): Promise<number> {
  if (!checkImage(full) || !checkImage(thumb)) throw new AdminInputError("jpg·png·webp 사진만, 2MB까지 올릴 수 있어요");
  await assertPlace(placeId);
  const db = getDb();
  const [{ n }] = await db.select({ n: count() }).from(studioPhotos).where(eq(studioPhotos.placeId, placeId));
  if (n >= MAX_STUDIO_PHOTOS) throw new AdminInputError(`사진은 ${MAX_STUDIO_PHOTOS}장까지예요`);

  const paths = photoPaths(`studios/${placeId}`, full, thumb);
  await uploadPair(store, paths, full, thumb);
  try {
    const [row] = await db.insert(studioPhotos).values({ placeId, ...paths, position: n }).returning({ id: studioPhotos.id });
    return row.id;
  } catch (e) {
    await store.remove([paths.path, paths.thumbPath]).catch(() => {});
    throw e;
  }
}

export async function deleteStudioPhoto(store: MediaStore, photoId: number) {
  const db = getDb();
  const [row] = await db.delete(studioPhotos).where(eq(studioPhotos.id, photoId)).returning({ path: studioPhotos.path, thumbPath: studioPhotos.thumbPath });
  if (!row) throw new AdminInputError("없는 사진이에요");
  // 파일을 못 지워도 화면에서는 이미 빠졌다. 남은 파일은 로그로 찾는다
  await store.remove([row.path, row.thumbPath]).catch((e) => console.error("[studios] photo file remove failed", e));
}

export async function getInstructorMediaForAdmin(instructorId: number): Promise<AdminInstructorMedia | null> {
  const [row] = await getDb()
    .select({
      bio: instructorProfiles.bio,
      portfolioVideoIds: instructorProfiles.portfolioVideoIds,
      mediaConsent: instructorProfiles.mediaConsent,
      photoThumbPath: instructorProfiles.photoThumbPath,
    })
    .from(instructorProfiles)
    .where(eq(instructorProfiles.id, instructorId))
    .limit(1);
  if (!row) return null;
  return { ...row, photoThumbUrl: row.photoThumbPath ? mediaUrl(row.photoThumbPath) : null };
}

// 소개·포트폴리오·사진/영상 게재 동의. 영상은 퍼가기가 허용된 YouTube만 (FR-11)
export async function saveInstructorProfile(input: z.output<typeof profileInput>) {
  await assertInstructor(input.instructorId);

  const ids: string[] = [];
  for (const url of input.portfolioUrls.filter(Boolean)) {
    const id = parseYouTubeVideoId(url);
    if (!id) throw new AdminInputError(`YouTube 링크를 확인해 주세요: ${url}`);
    const found = await lookupVideo(id);
    if (!found.ok) {
      throw new AdminInputError(
        found.reason === "embed_blocked" ? "퍼가기가 막힌 영상이에요. 다른 영상을 골라 주세요" : "영상을 찾을 수 없어요. 링크를 확인해 주세요",
      );
    }
    if (!ids.includes(id)) ids.push(id);
  }

  await getDb()
    .update(instructorProfiles)
    .set({ bio: input.bio, portfolioVideoIds: ids, mediaConsent: input.mediaConsent })
    .where(eq(instructorProfiles.id, input.instructorId));
}

export async function setInstructorPhoto(store: MediaStore, instructorId: number, full: unknown, thumb: unknown) {
  if (!checkImage(full) || !checkImage(thumb)) throw new AdminInputError("jpg·png·webp 사진만, 2MB까지 올릴 수 있어요");
  const db = getDb();
  const [before] = await db
    .select({ path: instructorProfiles.photoPath, thumbPath: instructorProfiles.photoThumbPath })
    .from(instructorProfiles)
    .where(eq(instructorProfiles.id, instructorId))
    .limit(1);
  if (!before) throw new AdminInputError("없는 강사예요");

  const paths = photoPaths(`instructors/${instructorId}`, full, thumb);
  await uploadPair(store, paths, full, thumb);
  await db.update(instructorProfiles).set({ photoPath: paths.path, photoThumbPath: paths.thumbPath }).where(eq(instructorProfiles.id, instructorId));
  const old = [before.path, before.thumbPath].filter((p): p is string => Boolean(p));
  if (old.length) await store.remove(old).catch((e) => console.error("[studios] old instructor photo remove failed", e));
}

export async function removeInstructorPhoto(store: MediaStore, instructorId: number) {
  const db = getDb();
  const [before] = await db
    .select({ path: instructorProfiles.photoPath, thumbPath: instructorProfiles.photoThumbPath })
    .from(instructorProfiles)
    .where(eq(instructorProfiles.id, instructorId))
    .limit(1);
  if (!before) throw new AdminInputError("없는 강사예요");
  await db.update(instructorProfiles).set({ photoPath: null, photoThumbPath: null }).where(eq(instructorProfiles.id, instructorId));
  const old = [before.path, before.thumbPath].filter((p): p is string => Boolean(p));
  if (old.length) await store.remove(old).catch((e) => console.error("[studios] instructor photo remove failed", e));
}

// 화면이 채워져 보이게 하는 테스트 데이터 (곡·가상 강사·스튜디오·클래스): pnpm db:seed:showcase
// 지금 dev DB는 운영 배포와 같은 DB라 사이트에도 보인다. 클래스 소개 첫 줄에 테스트라고 쓰고, 예약 링크는 example.com이다.
// 지울 때는 pnpm db:clean:showcase (scripts/clean-showcase.mts). 다시 실행해도 곡·강사·스튜디오는 겹치지 않고, 클래스는 새로 만든다
import postgres from "postgres";
import { normalizeAlias } from "../src/lib/normalize.ts";

try {
  process.loadEnvFile(".env.local");
} catch {}

const url = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("MIGRATION_DATABASE_URL 또는 DATABASE_URL이 없습니다 (app/.env.local)");
if (!url.includes("ap-northeast-2") && !process.argv.includes("--force")) {
  throw new Error("dev DB가 아닌 것 같아요. 확실하면 --force");
}

// 정리 스크립트(clean-showcase.mts)가 같은 표시로 찾는다
const HANDLE_PREFIX = "allbeat_test_";
const BOOKING_PREFIX = "https://example.com/allbeat-test/";

type VideoType = "dance_practice" | "performance";
type SeedSong = { title: string; aliases: string[]; video: { id: string; type: VideoType } };
type SeedArtist = { name: string; slug: string; aliases: string[]; songs: SeedSong[] };

// 영상은 공식 채널 영상만, 퍼가기 허용(oEmbed 200)을 확인한 것 (2026-10-28)
const ARTISTS: SeedArtist[] = [
  { name: "LE SSERAFIM", slug: "le-sserafim", aliases: ["르세라핌"], songs: [{ title: "HOT", aliases: ["핫"], video: { id: "3tbOGqoLPW0", type: "dance_practice" } }] },
  { name: "ILLIT", slug: "illit", aliases: ["아일릿"], songs: [{ title: "Cherish (My Love)", aliases: ["체리쉬", "Cherish"], video: { id: "bD9aJN48kuE", type: "dance_practice" } }] },
  { name: "CORTIS", slug: "cortis", aliases: ["코르티스"], songs: [{ title: "GO!", aliases: ["고"], video: { id: "gSm-eTRl9JE", type: "dance_practice" } }] },
  { name: "Hearts2Hearts", slug: "hearts2hearts", aliases: ["하츠투하츠", "하투하"], songs: [{ title: "STYLE", aliases: ["스타일"], video: { id: "NLjMZJKMOIc", type: "dance_practice" } }] },
  { name: "TWICE", slug: "twice", aliases: ["트와이스"], songs: [{ title: "Strategy", aliases: ["스트래티지"], video: { id: "h5CwaVjF_78", type: "performance" } }] },
  { name: "ENHYPEN", slug: "enhypen", aliases: ["엔하이픈"], songs: [{ title: "Knife", aliases: ["나이프"], video: { id: "vU43ebmiPRk", type: "dance_practice" } }] },
  { name: "NewJeans", slug: "newjeans", aliases: ["뉴진스"], songs: [{ title: "Ditto", aliases: ["디토"], video: { id: "G_1zDzhAz9w", type: "dance_practice" } }] },
];

// 가상 강사. 인스타 아이디는 없는 아이디(표시용 접두어)
const INSTRUCTORS = [
  { key: "minji", name: "민지", bio: "걸그룹 커버 8년차, 입문자도 완곡까지", region: "마포구", studio: { name: "올빗 연습실 홍대점", address: "서울 마포구 양화로 160", facilities: ["mirror", "wood_floor", "locker_room", "air_con"] } },
  { key: "seojun", name: "서준", bio: "보이그룹 안무 전문, 파워풀하게 끝까지", region: "강남구", studio: { name: "올빗 연습실 강남점", address: "서울 강남구 강남대로 396", facilities: ["mirror", "wood_floor", "shower", "parking", "elevator"] } },
  { key: "harin", name: "하린", bio: "포인트 안무를 디테일하게, 촬영까지", region: "성동구", studio: { name: "올빗 연습실 성수점", address: "서울 성동구 성수이로 113", facilities: ["mirror", "mat", "locker_room", "air_con"] } },
  { key: "jiwoo", name: "지우", bio: "챌린지부터 완곡까지 즐겁게", region: "송파구", studio: { name: "올빗 연습실 잠실점", address: "서울 송파구 백제고분로 435", facilities: ["mirror", "wood_floor", "elevator", "air_con"] } },
] as const;

type Status = "open" | "closing_soon" | "closed" | "canceled";
type Level = "intro" | "beginner" | "intermediate_plus";
type Booking = "naver" | "kakao_openchat" | "insta_dm" | "google_form";
// day: 오늘(KST)부터 며칠 뒤, start·end: KST 시각
const CLASSES: {
  instructor: string;
  songs: string[];
  title: string;
  day: number;
  start: string;
  end: string;
  price: number;
  level: Level;
  capacity: number | null;
  status: Status;
  booking: Booking;
  about: string;
}[] = [
  { instructor: "minji", songs: ["le-sserafim-hot"], title: "HOT 후렴 완곡반", day: 1, start: "19:30", end: "21:00", price: 30000, level: "intro", capacity: 12, status: "closing_soon", booking: "naver", about: "후렴 킬링파트부터 1절 완곡까지. 카운트를 나눠 천천히 갑니다." },
  { instructor: "harin", songs: ["illit-cherish-my-love"], title: "Cherish 포인트 안무", day: 2, start: "20:00", end: "21:30", price: 35000, level: "beginner", capacity: 10, status: "open", booking: "insta_dm", about: "손동작이 많은 포인트 안무를 디테일하게 맞춰요. 마지막 15분은 촬영." },
  { instructor: "seojun", songs: ["cortis-go"], title: "GO! 원데이 클래스", day: 2, start: "19:00", end: "21:00", price: 40000, level: "intermediate_plus", capacity: 14, status: "open", booking: "kakao_openchat", about: "파워풀한 보이그룹 안무. 체력 각오하고 오세요." },
  { instructor: "jiwoo", songs: ["hearts2hearts-style"], title: "STYLE 챌린지반", day: 3, start: "14:00", end: "15:30", price: 25000, level: "intro", capacity: 16, status: "open", booking: "google_form", about: "챌린지 구간 위주로 가볍게. 처음 오는 분 환영." },
  { instructor: "minji", songs: ["twice-strategy"], title: "Strategy 완곡", day: 4, start: "15:00", end: "17:00", price: 38000, level: "beginner", capacity: 12, status: "open", booking: "naver", about: "무빙 버전 동선까지 완곡으로 배워요." },
  { instructor: "seojun", songs: ["enhypen-knife"], title: "Knife 킬링파트", day: 4, start: "19:00", end: "20:30", price: 35000, level: "beginner", capacity: 12, status: "closing_soon", booking: "kakao_openchat", about: "킬링파트를 확실하게. 남는 시간은 프리스타일." },
  { instructor: "harin", songs: ["newjeans-ditto"], title: "Ditto 감성 안무", day: 5, start: "20:00", end: "21:30", price: 32000, level: "intro", capacity: 10, status: "open", booking: "insta_dm", about: "부드러운 무드 표현까지 함께 연습해요." },
  { instructor: "jiwoo", songs: ["a2o-lite-neon"], title: "NEON 입문반", day: 6, start: "13:00", end: "14:30", price: 28000, level: "intro", capacity: 15, status: "open", booking: "google_form", about: "NEON 처음 배우는 분을 위한 반이에요." },
  { instructor: "minji", songs: ["le-sserafim-hot", "illit-cherish-my-love"], title: "걸그룹 2곡 메들리", day: 7, start: "16:00", end: "18:00", price: 45000, level: "intermediate_plus", capacity: 12, status: "open", booking: "naver", about: "HOT과 Cherish 킬링파트를 이어서 메들리로." },
  { instructor: "seojun", songs: ["cortis-go"], title: "GO! 2회차", day: 9, start: "19:00", end: "21:00", price: 40000, level: "intermediate_plus", capacity: 14, status: "open", booking: "kakao_openchat", about: "1회차를 못 온 분을 위한 같은 구성 수업." },
  { instructor: "harin", songs: ["twice-strategy"], title: "Strategy 포인트반", day: 11, start: "20:00", end: "21:30", price: 33000, level: "beginner", capacity: 10, status: "open", booking: "insta_dm", about: "포인트 안무와 표정 연습 위주." },
  { instructor: "jiwoo", songs: ["newjeans-ditto"], title: "Ditto 원데이", day: 13, start: "14:00", end: "15:30", price: 27000, level: "intro", capacity: 16, status: "open", booking: "google_form", about: "주말 낮 편하게 배우는 반." },
  { instructor: "seojun", songs: ["enhypen-knife"], title: "Knife 완곡반", day: 3, start: "20:00", end: "22:00", price: 42000, level: "intermediate_plus", capacity: 12, status: "closed", booking: "kakao_openchat", about: "완곡 구성. 일찍 마감됐어요." },
  { instructor: "minji", songs: ["hearts2hearts-style"], title: "STYLE 평일반", day: 5, start: "19:00", end: "20:30", price: 30000, level: "beginner", capacity: 10, status: "canceled", booking: "naver", about: "평일 저녁 반." },
];

// 운영자 화면과 같은 방식: 주소 → 위치 (카카오 로컬 API, 키가 없으면 위치 없이)
async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) return null;
  const res = await fetch(`https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}&size=1`, {
    headers: { Authorization: `KakaoAK ${key}` },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return null;
  const doc = ((await res.json()) as { documents?: { x: string; y: string }[] }).documents?.[0];
  return doc ? { lat: Number(doc.y), lng: Number(doc.x) } : null;
}

async function videoMeta(id: string): Promise<{ title: string; channel: string; thumb: string } | null> {
  const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) return null;
  const d = (await res.json()) as { title: string; author_name: string; thumbnail_url: string };
  return { title: d.title, channel: d.author_name, thumb: d.thumbnail_url };
}

// 바깥 API는 트랜잭션 전에 부른다
const videos = new Map<string, Awaited<ReturnType<typeof videoMeta>>>();
for (const a of ARTISTS) for (const s of a.songs) videos.set(s.video.id, await videoMeta(s.video.id));
const locations = new Map<string, Awaited<ReturnType<typeof geocode>>>();
for (const i of INSTRUCTORS) locations.set(i.key, await geocode(i.studio.address));

const songSlug = (artistSlug: string, title: string) => `${artistSlug}-${title.toLowerCase().replace(/[^a-z0-9가-힣]+/g, "-").replace(/^-+|-+$/g, "")}`;

const sql = postgres(url, { max: 1 });

await sql.begin(async (tx) => {
  // 곡·아티스트
  for (const artist of ARTISTS) {
    const [{ id: artistId }] = await tx`
      insert into artists (name, slug) values (${artist.name}, ${artist.slug})
      on conflict (slug) do update set name = excluded.name
      returning id`;
    for (const [i, alias] of [artist.name, ...artist.aliases].entries()) {
      await tx`insert into artist_aliases (artist_id, alias, alias_norm, is_primary) values (${artistId}, ${alias}, ${normalizeAlias(alias)}, ${i === 0}) on conflict (artist_id, alias_norm) do nothing`;
    }
    for (const song of artist.songs) {
      const v = videos.get(song.video.id);
      const slug = songSlug(artist.slug, song.title);
      const [{ id: songId }] = await tx`
        insert into songs (artist_id, title, slug, review_status, yt_video_id, video_type, video_title, video_channel, video_thumb_url, video_embeddable, video_synced_at)
        values (${artistId}, ${song.title}, ${slug}, 'confirmed', ${v ? song.video.id : null}, ${v ? song.video.type : null}, ${v?.title ?? null}, ${v?.channel ?? null}, ${v?.thumb ?? null}, ${v ? true : null}, ${v ? new Date() : null})
        on conflict (slug) do update set title = excluded.title
        returning id`;
      for (const [i, alias] of [song.title, ...song.aliases].entries()) {
        await tx`insert into song_aliases (song_id, alias, alias_norm, is_primary) values (${songId}, ${alias}, ${normalizeAlias(alias)}, ${i === 0}) on conflict (song_id, alias_norm) do nothing`;
      }
      console.log(`✓ 곡 ${artist.name} - ${song.title}${v ? "" : " (영상 확인 실패, 영상 없이)"} → /song/${slug}`);
    }
  }

  // 가상 강사·스튜디오
  const placeOf = new Map<string, { id: number; studioName: string; address: string; regionId: number }>();
  for (const ins of INSTRUCTORS) {
    const handle = `${HANDLE_PREFIX}${ins.key}`;
    const [{ id: instructorId }] = await tx`
      insert into instructor_profiles (display_name, instagram_handle, bio, status, is_proxy, consent_at, consent_note, approved_at, media_consent)
      values (${ins.name}, ${handle}, ${ins.bio}, 'approved', true, now(), ${"테스트 데이터 (scripts/seed-showcase.mts)"}, now(), true)
      on conflict (instagram_handle) do update set display_name = excluded.display_name, bio = excluded.bio
      returning id`;
    const [{ region_id: regionId }] = await tx`select region_id from region_mappings where sigungu = ${ins.region} and bname is null`;
    await tx`insert into instructor_regions (instructor_id, region_id) values (${instructorId}, ${regionId}) on conflict do nothing`;

    const loc = locations.get(ins.key) ?? null;
    let [place] = await tx`select id from instructor_places where instructor_id = ${instructorId} and studio_name = ${ins.studio.name}`;
    if (!place) {
      [place] = await tx`
        insert into instructor_places (instructor_id, studio_name, address, sigungu, region_id, lat, lng, facilities, last_used_at)
        values (${instructorId}, ${ins.studio.name}, ${ins.studio.address}, ${ins.region}, ${regionId}, ${loc?.lat ?? null}, ${loc?.lng ?? null}, ${ins.studio.facilities as unknown as string[]}, now())
        returning id`;
    }
    placeOf.set(ins.key, { id: place.id, studioName: ins.studio.name, address: ins.studio.address, regionId });
    console.log(`✓ 강사 ${ins.name} (@${handle}) · ${ins.studio.name}${loc ? "" : " (위치 없음)"}`);
  }

  // 클래스. 다시 실행하면 이전 테스트 클래스를 지우고 새로 만든다 (날짜가 늘 앞으로 2주가 되게)
  await tx`delete from classes where starts_with(booking_url, ${BOOKING_PREFIX})`;
  for (const [n, c] of CLASSES.entries()) {
    const place = placeOf.get(c.instructor)!;
    const [{ id: instructorId }] = await tx`select id from instructor_profiles where instagram_handle = ${HANDLE_PREFIX + c.instructor}`;
    // 오늘(KST) + day일의 start·end 시각(KST)
    const [cls] = await tx`
      insert into classes (instructor_id, title, starts_at, ends_at, studio_name, address, place_id, region_id, price, level, capacity, booking_url, booking_type, description, status, cancel_reason, created_by_admin)
      values (${instructorId}, ${c.title},
        (date_trunc('day', now() at time zone 'Asia/Seoul') + make_interval(days => ${c.day}) + ${c.start}::time) at time zone 'Asia/Seoul',
        (date_trunc('day', now() at time zone 'Asia/Seoul') + make_interval(days => ${c.day}) + ${c.end}::time) at time zone 'Asia/Seoul',
        ${place.studioName}, ${place.address}, ${place.id}, ${place.regionId}, ${c.price}, ${c.level}, ${c.capacity},
        ${`${BOOKING_PREFIX}${n + 1}`}, ${c.booking},
        ${`테스트용 예시 클래스예요. 실제로 열리지 않아요.\n\n${c.about}`},
        ${c.status}, ${c.status === "canceled" ? "개인 사정" : null}, true)
      returning id`;
    for (const [i, slug] of c.songs.entries()) {
      const [song] = await tx`select id from songs where slug = ${slug}`;
      if (!song) throw new Error(`없는 곡: ${slug}`);
      await tx`insert into class_songs (class_id, song_id, position) values (${cls.id}, ${song.id}, ${i + 1})`;
    }
  }
  console.log(`✓ 클래스 ${CLASSES.length}개`);
});

await sql.end();

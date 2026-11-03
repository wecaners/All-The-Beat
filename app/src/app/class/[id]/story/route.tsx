import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { formatPrice, formatTimeRange, LEVEL_LABEL } from "@/lib/format";
import { type ClassDetail, getPublicClass } from "@/server/classes";

// 인스타 스토리용 9:16 이미지 (F-23, specs/story-image). 공개 클래스만, 저장하지 않고 그때그때 그린다.
// 글꼴은 메이플스토리 원본 woff를 그대로 읽는다 (수정·변환 금지, design.md). Pretendard는 woff2뿐이라 쓸 수 없다
const WIDTH = 1080;
const HEIGHT = 1920;
const mapleFont = readFile(join(process.cwd(), "src/app/fonts/MaplestoryOTFBold.woff"));

const COLOR = { paper: "#fff7ec", card: "#ffffff", ink: "#161616", sub: "#6f655a", pink: "#ff6fb5", lime: "#cff23a", sky: "#7cc8ff", butter: "#ffe15c", lilac: "#c9b6ff" };
const STATUS_TEXT = { open: "모집 중", closing_soon: "마감 임박", closed: "마감", ended: "끝난 클래스", canceled: "취소" } as const;
const STATUS_COLOR = { open: COLOR.lime, closing_soon: COLOR.butter, closed: COLOR.card, ended: COLOR.card, canceled: COLOR.card } as const;
const KST_DATE = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric", weekday: "short" });

// 새 라우트라 생성된 RouteContext 타입에 아직 없다. 클래스 상세 페이지와 같은 모양으로 받는다
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const c = await getPublicClass(id);
  if (!c) return new Response("클래스를 찾을 수 없어요", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });

  const host = new URL(request.url).host;
  return new ImageResponse(<Story c={c} url={`${host}/class/${c.id}`} />, {
    width: WIDTH,
    height: HEIGHT,
    fonts: [{ name: "Maple", data: await mapleFont, weight: 700, style: "normal" }],
    headers: { "cache-control": "no-store" },
  });
}

// Satori는 flex와 CSS 일부만 지원한다. 자식이 여럿인 div에는 display: flex를 꼭 준다
function Story({ c, url }: { c: ClassDetail; url: string }) {
  const song = c.songs[0];
  const border = `6px solid ${COLOR.ink}`;
  return (
    <div style={{ width: WIDTH, height: HEIGHT, display: "flex", flexDirection: "column", backgroundColor: COLOR.paper, fontFamily: "Maple", color: COLOR.ink, padding: 72 }}>
      {/* 로고 */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16 }}>
        <div style={{ fontSize: 64, color: COLOR.pink }}>All the Beat</div>
        <div style={{ fontSize: 36, color: COLOR.lime, marginBottom: 10 }}>올빗</div>
      </div>
      <div style={{ fontSize: 34, color: COLOR.sub, marginTop: 8 }}>지금 뜨는 K-pop 곡의 원데이 댄스 클래스</div>

      {/* 포토카드 */}
      <div style={{ display: "flex", flexDirection: "column", marginTop: 72, backgroundColor: COLOR.card, border, borderRadius: 48, boxShadow: `14px 14px 0 ${COLOR.ink}`, padding: 56 }}>
        <div style={{ display: "flex", gap: 16 }}>
          <Sticker color={STATUS_COLOR[c.status]}>{STATUS_TEXT[c.status]}</Sticker>
          <Sticker color={COLOR.sky}>{LEVEL_LABEL[c.level]}</Sticker>
        </div>
        {song && (
          <div style={{ display: "flex", flexDirection: "column", marginTop: 40 }}>
            <div style={{ fontSize: 96, lineHeight: 1.1, backgroundColor: COLOR.lime, padding: "0 16px", alignSelf: "flex-start", maxWidth: 880 }}>{song.title}</div>
            <div style={{ fontSize: 44, color: COLOR.sub, marginTop: 16 }}>{song.artistName}</div>
          </div>
        )}
        <div style={{ fontSize: 48, marginTop: 36, lineHeight: 1.3 }}>{c.title}</div>

        {/* 티켓: 날짜 크게 */}
        <div style={{ display: "flex", marginTop: 48, border, borderRadius: 36, overflow: "hidden" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 260, backgroundColor: COLOR.pink, color: COLOR.card, padding: "28px 0", borderRight: `6px dashed ${COLOR.ink}` }}>
            <div style={{ fontSize: 120, lineHeight: 1 }}>{String(new Date(c.startsAt.getTime() + 9 * 3600 * 1000).getUTCDate()).padStart(2, "0")}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "28px 40px", gap: 14, fontSize: 40 }}>
            <div>{KST_DATE.format(c.startsAt)}</div>
            <div>{formatTimeRange(c.startsAt, c.endsAt)}</div>
            <div style={{ color: COLOR.sub }}>{`${c.regionName} · ${c.studioName}`}</div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 44 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 34, color: COLOR.sub }}>강사</div>
            <div style={{ fontSize: 52 }}>{c.instructor.displayName}</div>
          </div>
          <div style={{ fontSize: 64 }}>{formatPrice(c.price)}</div>
        </div>
      </div>

      {/* 주소 안내 */}
      <div style={{ display: "flex", flexDirection: "column", marginTop: "auto", backgroundColor: COLOR.butter, border, borderRadius: 40, padding: "40px 48px", boxShadow: `10px 10px 0 ${COLOR.ink}` }}>
        <div style={{ fontSize: 40 }}>링크 스티커에 이 주소를 붙여 주세요</div>
        <div style={{ fontSize: 44, color: COLOR.pink, marginTop: 12, backgroundColor: COLOR.card, padding: "12px 20px", border: `4px solid ${COLOR.ink}`, borderRadius: 20, alignSelf: "flex-start" }}>{url}</div>
        <div style={{ fontSize: 30, color: COLOR.sub, marginTop: 18 }}>예약은 강사님 링크로 · 올빗에서 곡으로 클래스 찾기</div>
      </div>
    </div>
  );
}

function Sticker({ color, children }: { color: string; children: string }) {
  return <div style={{ display: "flex", fontSize: 34, backgroundColor: color, border: `5px solid ${COLOR.ink}`, borderRadius: 999, padding: "10px 28px", boxShadow: `5px 5px 0 ${COLOR.ink}` }}>{children}</div>;
}

import Link from "next/link";
import type { ReactNode } from "react";
import { type AdminMetrics, METRIC_TARGETS, type MetricSong } from "@/server/admin/metrics";
import { Section, Table, Td } from "./ui";

// 운영 첫 화면 맨 위의 성공 지표 (F-18, A-06). 숫자는 화면을 열 때마다 센다
export function MetricsView({ m }: { m: AdminMetrics }) {
  const t = METRIC_TARGETS;
  return (
    <>
      <Section title="지표">
        <Table head={["지표", "지금", "목표", "자세히"]}>
          <Row label="등록된 클래스" value={m.classes.total} target={t.classes}>
            대리 {m.classes.byAdmin} · 직접 {m.classes.byInstructor} · 이번 주 {m.classes.thisWeek} (취소·숨김 제외)
          </Row>
          <Row label="자발적 등록 강사" value={m.selfServeInstructors} target={t.selfServeInstructors} unit="명">
            클래스를 직접 올린 적이 있는 강사
          </Row>
          <Row label="예약 링크 클릭" value={m.clicks.total} target={t.clicks} unit="회">
            이번 주 {m.clicks.thisWeek}회
          </Row>
          <Row label="요청 → 개설" value={m.convertedSongs.length} target={t.convertedSongs} unit="곡">
            추가요가 있던 곡에 클래스가 열린 곡
          </Row>
          <Row label="재방문" value={m.revisit.returned} target={t.revisits} unit="명">
            {m.revisit.since
              ? `${formatDate(m.revisit.since)}부터 가입한 ${m.revisit.signups}명 중 2주 안에 다시 온 사람`
              : "아직 접속 기록이 없어요"}
          </Row>
          <Row label="추가요" value={m.requests.total} unit="건">
            취소 제외
          </Row>
          <tr>
            <Td>앵콜 → 개설</Td>
            <Td>
              <b>{m.encore.reached === 0 ? "아직 없음" : `${m.encore.opened} / ${m.encore.reached}`}</b>
            </Td>
            <Td>—</Td>
            <Td>
              <span className="text-zinc-500">기준 인원에 닿은 클래스 중 앵콜 클래스가 열린 수</span>
            </Td>
          </tr>
        </Table>
      </Section>

      <Section title="클릭 많은 클래스">
        <Table head={["클래스", "클릭"]} empty={m.clicks.top.length === 0}>
          {m.clicks.top.map((c) => (
            <tr key={c.classId}>
              <Td>
                <Link href={`/admin/classes/${c.classId}`} className="underline">
                  {c.title}
                </Link>
              </Td>
              <Td>{c.clicks}</Td>
            </tr>
          ))}
        </Table>
      </Section>

      <Section title="추가요 많은 곡">
        <Table head={["곡", "추가요"]} empty={m.requests.top.length === 0}>
          {m.requests.top.map((s) => (
            <tr key={s.songId}>
              <Td>
                <SongLink song={s} />
              </Td>
              <Td>{s.count}</Td>
            </tr>
          ))}
        </Table>
      </Section>

      <Section title={`요청 → 개설된 곡 ${m.convertedSongs.length}`}>
        <Table head={["곡"]} empty={m.convertedSongs.length === 0}>
          {m.convertedSongs.map((s) => (
            <tr key={s.songId}>
              <Td>
                <SongLink song={s} />
              </Td>
            </tr>
          ))}
        </Table>
      </Section>
    </>
  );
}

function Row({ label, value, target, unit = "", children }: { label: string; value: number; target?: number; unit?: string; children: ReactNode }) {
  const reached = target !== undefined && value >= target;
  return (
    <tr>
      <Td>{label}</Td>
      <Td>
        <b>
          {value}
          {unit}
        </b>
      </Td>
      <Td>
        {target === undefined ? (
          "—"
        ) : (
          <>
            {target}
            {unit}
            {reached && <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-bold text-emerald-900">도달</span>}
          </>
        )}
      </Td>
      <Td>
        <span className="text-zinc-500">{children}</span>
      </Td>
    </tr>
  );
}

function SongLink({ song }: { song: MetricSong }) {
  return (
    <Link href={`/admin/songs/${song.songId}`} className="underline">
      {song.title} · {song.artistName}
    </Link>
  );
}

// "2026-11-04" → "11월 4일"
function formatDate(date: string): string {
  const [, month, day] = date.split("-").map(Number);
  return `${month}월 ${day}일`;
}

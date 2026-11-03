"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ClassTicket } from "@/components/class-ticket";
import { StickerButton } from "@/components/sticker-button";
import { formatClassDate, formatPrice, formatTimeRange, LEVEL_LABEL } from "@/lib/format";
import type { ClassCursor, ClassListItem } from "@/server/classes/list";
import { loadMoreClassesAction } from "./actions";

type Props = { initial: ClassListItem[]; nextCursor: ClassCursor | null; search: string };

function badgeOf(c: ClassListItem): string | null {
  if (c.status === "closing_soon") return "마감 임박";
  if (c.status === "closed") return c.encoreCount > 0 ? `마감 · 앵콜 ${c.encoreCount}` : "마감";
  return null;
}

// 날짜별로 묶은 티켓 목록. 끝에 닿으면 다음 20개를 이어 붙인다. 관찰이 안 되거나 실패하면 [더 보기]로 (FR-6).
// 조건이 바뀌면 서버가 새 initial을 주므로 key로 다시 만든다 (page.tsx)
export function ClassList({ initial, nextCursor: initialCursor, search }: Props) {
  const [items, setItems] = useState(initial);
  const [cursor, setCursor] = useState(initialCursor);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const sentinel = useRef<HTMLDivElement>(null);
  const loading = useRef(false);

  function loadMore() {
    if (!cursor || loading.current) return;
    loading.current = true;
    startTransition(async () => {
      const result = await loadMoreClassesAction(search, cursor);
      if (result.ok) {
        setItems((prev) => [...prev, ...result.items]);
        setCursor(result.nextCursor);
        setFailed(false);
      } else {
        setFailed(true);
      }
      loading.current = false;
    });
  }

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !cursor || failed) return;
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && loadMore(), { rootMargin: "240px" });
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 커서가 바뀔 때만 다시 관찰한다
  }, [cursor, failed]);

  // 날짜 헤더로 묶는다. 이어 붙인 항목도 같은 날이면 같은 묶음
  const groups: { day: string; items: ClassListItem[] }[] = [];
  for (const c of items) {
    const day = formatClassDate(c.startsAt);
    const g = groups[groups.length - 1];
    if (g && g.day === day) g.items.push(c);
    else groups.push({ day, items: [c] });
  }

  return (
    <>
      {groups.map((g) => (
        <section key={g.day} className="mt-5 px-5">
          <h2 className="mb-2.5 font-display text-[19px]">
            <span className="mark-lime">{g.day}</span>
          </h2>
          <ul className="space-y-4">
            {g.items.map((c, i) => (
              <li key={c.id} className={c.status === "closed" ? "opacity-60" : undefined}>
                <ClassTicket
                  href={`/class/${c.id}`}
                  index={i}
                  title={`${c.songTitle} · ${c.artistName}`}
                  startsAt={c.startsAt}
                  meta={`${formatTimeRange(c.startsAt, c.endsAt)} · ${c.regionName} · ${c.instructorName}`}
                  detail={`${formatPrice(c.price)} · ${LEVEL_LABEL[c.level]}`}
                  badge={badgeOf(c)}
                  thumbnailUrl={c.videoId ? `https://i.ytimg.com/vi/${c.videoId}/mqdefault.jpg` : null}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
      {cursor && (
        <div ref={sentinel} className="mt-6 px-5">
          <StickerButton type="button" variant="white" size="md" display={false} onClick={loadMore} disabled={pending}>
            {pending ? "불러오는 중…" : failed ? "다시 불러오기" : "더 보기"}
          </StickerButton>
        </div>
      )}
    </>
  );
}

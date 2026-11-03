"use server";

import { classCursor, type ClassCursor, type ClassListItem, listClasses, parseClassListQuery } from "@/server/classes/list";

export type LoadMoreResult = { ok: true; items: ClassListItem[]; nextCursor: ClassCursor | null } | { ok: false };

// 다음 20개 (F-03 무한 스크롤). 조건은 화면의 주소 그대로, 커서는 마지막 항목. 로그인은 필요 없다(읽기만)
export async function loadMoreClassesAction(search: string, cursor: ClassCursor): Promise<LoadMoreResult> {
  const parsed = classCursor.safeParse(cursor);
  if (!parsed.success) return { ok: false };
  try {
    const page = await listClasses(parseClassListQuery(new URLSearchParams(search.slice(0, 500))), parsed.data);
    return { ok: true, ...page };
  } catch (e) {
    console.error("loadMoreClasses failed", e);
    return { ok: false };
  }
}

// 화면 표시용 포맷. 시간은 전부 KST로 보여준다

const KST = "Asia/Seoul";

// "11/2(토) 19:00~21:00"
export function formatClassTime(startsAt: Date, endsAt: Date): string {
  const date = new Intl.DateTimeFormat("ko-KR", { timeZone: KST, month: "numeric", day: "numeric", weekday: "short" })
    .formatToParts(startsAt)
    .reduce<Record<string, string>>((acc, p) => ({ ...acc, [p.type]: p.value }), {});
  const time = (d: Date) =>
    new Intl.DateTimeFormat("ko-KR", { timeZone: KST, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
  return `${date.month}/${date.day}(${date.weekday}) ${time(startsAt)}~${time(endsAt)}`;
}

export function formatPrice(price: number): string {
  return price === 0 ? "무료" : `${price.toLocaleString("ko-KR")}원`;
}

export const LEVEL_LABEL = { intro: "입문", beginner: "초급", intermediate_plus: "중급 이상" } as const;

export const TIME_PREF_LABEL = {
  weekday_evening: "평일 저녁",
  weekend_day: "주말 낮",
  weekend_evening: "주말 저녁",
  any: "상관없음",
} as const;

export const VIDEO_TYPE_LABEL = { dance_practice: "안무 연습", performance: "퍼포먼스", mv: "MV" } as const;

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

// 티켓 날짜: { month: "NOV", day: "01", weekday: "토" } (KST)
export function formatTicketDate(d: Date): { month: string; day: string; weekday: string } {
  const month = new Intl.DateTimeFormat("en-US", { timeZone: KST, month: "short" }).format(d).toUpperCase();
  const day = new Intl.DateTimeFormat("en-US", { timeZone: KST, day: "2-digit" }).format(d);
  const weekday = new Intl.DateTimeFormat("ko-KR", { timeZone: KST, weekday: "short" }).format(d);
  return { month, day, weekday };
}

// "19:00~21:00" (KST)
export function formatTimeRange(startsAt: Date, endsAt: Date): string {
  const time = (d: Date) => new Intl.DateTimeFormat("ko-KR", { timeZone: KST, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
  return `${time(startsAt)}~${time(endsAt)}`;
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

// 포토카드 아래 팬진 라벨용 영문
export const VIDEO_TYPE_ZINE = { dance_practice: "DANCE PRACTICE", performance: "PERFORMANCE", mv: "MUSIC VIDEO" } as const;

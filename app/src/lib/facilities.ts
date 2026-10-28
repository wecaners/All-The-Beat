// 스튜디오 시설 (specs/instructor-studio FR-4). 키는 DB에, 이름은 화면에
export const FACILITIES = {
  mirror: "거울",
  wood_floor: "마루 바닥",
  mat: "매트",
  locker_room: "탈의실",
  shower: "샤워실",
  parking: "주차",
  elevator: "엘리베이터",
  air_con: "냉난방",
} as const;
export type Facility = keyof typeof FACILITIES;

export function isFacility(v: string): v is Facility {
  return v in FACILITIES;
}

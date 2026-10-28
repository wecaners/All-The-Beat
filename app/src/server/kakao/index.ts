// 카카오 로컬 API (specs/instructor-studio). REST 키는 서버 전용이라 이 모듈은 서버에서만 부른다 (FR-14)

const BASE = "https://dapi.kakao.com/v2/local/search";

export type StudioCandidate = {
  name: string;
  address: string;
  lat: number;
  lng: number;
  /** 카카오맵 장소면 있다. 주소 검색 결과는 null */
  kakaoPlaceId: string | null;
  kakaoPlaceUrl: string | null;
  category: string | null;
};

export function kakaoConfigured(): boolean {
  return Boolean(process.env.KAKAO_REST_API_KEY);
}

async function call<T>(path: string, query: string): Promise<T[]> {
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) throw new Error("KAKAO_REST_API_KEY가 없습니다");
  const res = await fetch(`${BASE}/${path}?query=${encodeURIComponent(query)}&size=8`, {
    headers: { Authorization: `KakaoAK ${key}` },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`카카오 로컬 API ${res.status}`);
  const body = (await res.json()) as { documents?: T[] };
  return body.documents ?? [];
}

type KeywordDoc = { id: string; place_name: string; category_name: string; address_name: string; road_address_name: string; x: string; y: string; place_url: string };
type AddressDoc = { address_name: string; road_address: { address_name: string } | null; x: string; y: string };

// 연습실 이름으로 카카오맵 장소를 찾는다. 도로명 주소를 먼저 쓴다
export async function searchKakaoPlaces(query: string): Promise<StudioCandidate[]> {
  const docs = await call<KeywordDoc>("keyword.json", query);
  return docs.map((d) => ({
    name: d.place_name,
    address: d.road_address_name || d.address_name,
    lat: Number(d.y),
    lng: Number(d.x),
    kakaoPlaceId: d.id,
    kakaoPlaceUrl: d.place_url || null,
    category: d.category_name || null,
  }));
}

// 카카오맵에 없는 연습실은 주소로 찾는다. 이름은 운영자가 넣는다
export async function searchKakaoAddresses(query: string): Promise<StudioCandidate[]> {
  const docs = await call<AddressDoc>("address.json", query);
  return docs.map((d) => ({
    name: "",
    address: d.road_address?.address_name || d.address_name,
    lat: Number(d.y),
    lng: Number(d.x),
    kakaoPlaceId: null,
    kakaoPlaceUrl: null,
    category: null,
  }));
}

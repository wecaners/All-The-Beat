"use client";

import { useEffect, useRef, useState } from "react";

// 카카오맵 JS SDK에서 쓰는 만큼만 타입을 둔다
type KakaoMaps = {
  load(callback: () => void): void;
  LatLng: new (lat: number, lng: number) => unknown;
  StaticMap: new (container: HTMLElement, options: { center: unknown; level: number; marker: { position: unknown } }) => unknown;
};
declare global {
  interface Window {
    kakao?: { maps: KakaoMaps };
  }
}

let sdk: Promise<KakaoMaps> | null = null;

// SDK는 한 번만, 필요할 때 불러온다 (첫 화면 속도)
function loadSdk(key: string): Promise<KakaoMaps> {
  sdk ??= new Promise<KakaoMaps>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&autoload=false`;
    script.async = true;
    script.onload = () => (window.kakao ? window.kakao.maps.load(() => resolve(window.kakao!.maps)) : reject(new Error("kakao maps missing")));
    script.onerror = () => {
      sdk = null;
      reject(new Error("kakao maps sdk load failed"));
    };
    document.head.appendChild(script);
  });
  return sdk;
}

// 연습실 위치 미리보기 (specs/instructor-studio FR-9). 움직이지 않는 정적 지도라 스크롤을 뺏지 않고,
// 누르면 카카오맵이 열린다(SDK가 링크를 붙인다). 화면에 들어올 때만 불러오고, 키가 없거나 실패하면 그리지 않는다
export function StaticMap({ lat, lng, label }: { lat: number; lng: number; label: string }) {
  const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
  const box = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!key || !el) return;
    const io = new IntersectionObserver(
      async ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        try {
          const maps = await loadSdk(key);
          const position = new maps.LatLng(lat, lng);
          el.replaceChildren();
          new maps.StaticMap(el, { center: position, level: 3, marker: { position } });
        } catch (e) {
          console.error("[static-map]", e);
          setFailed(true);
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [key, lat, lng]);

  if (!key || failed) return null;
  return (
    <figure className="overflow-hidden rounded-xl border-2 border-ink">
      <div ref={box} className="aspect-[16/9] w-full bg-paper [&_img]:max-w-none" />
      <figcaption className="sr-only">{label} 위치 지도. 누르면 카카오맵이 열려요</figcaption>
    </figure>
  );
}

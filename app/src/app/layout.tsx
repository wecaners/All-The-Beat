import type { Metadata, Viewport } from "next";
import { Bagel_Fat_One, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";

// 외침·제목·큰 숫자. Google 데이터에 한글 서브셋이 없어 미리 불러오지 않는다 (specs/design-system findings)
const bagel = Bagel_Fat_One({ weight: "400", subsets: ["latin"], variable: "--font-bagel", preload: false, display: "swap" });
// 팬진 라벨 (영문 대문자 작게)
const bricolage = Bricolage_Grotesque({ weight: ["600", "800"], subsets: ["latin"], variable: "--font-bricolage", display: "swap" });

export const metadata: Metadata = {
  title: "올빗 · All the Beat",
  description: "지금 유행하는 K-pop 곡의 원데이 댄스 클래스를 곡으로 찾고, 없으면 추가요!",
};

export const viewport: Viewport = { themeColor: "#fff7ec" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${bagel.variable} ${bricolage.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-paper">{children}</body>
    </html>
  );
}

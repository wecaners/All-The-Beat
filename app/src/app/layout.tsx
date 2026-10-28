import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

// 로고·외침·제목·큰 숫자. 넥슨 메이플스토리 서체 © NEXON Korea Corporation.
// 약관이 파일 수정을 금해 원본 woff를 그대로 서빙한다 (specs/design-system findings)
const maple = localFont({ src: "./fonts/MaplestoryOTFBold.woff", weight: "700", variable: "--font-maple", display: "swap" });
// 팬진 라벨 (영문 대문자 작게)
const bricolage = Bricolage_Grotesque({ weight: ["600", "800"], subsets: ["latin"], variable: "--font-bricolage", display: "swap" });

export const metadata: Metadata = {
  title: "올빗 · All the Beat",
  description: "지금 유행하는 K-pop 곡의 원데이 댄스 클래스를 곡으로 찾고, 없으면 추가요!",
};

export const viewport: Viewport = { themeColor: "#fff7ec" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${maple.variable} ${bricolage.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-paper">{children}</body>
    </html>
  );
}

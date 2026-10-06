import type { Metadata } from "next";
import { Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";
import "./themes.css";

const sans = Noto_Sans_KR({ variable: "--font-sans", subsets: ["latin"], weight: ["400", "500", "700", "900"] });
const serif = Noto_Serif_KR({ variable: "--font-serif", subsets: ["latin"], weight: ["400", "700", "900"] });

export const metadata: Metadata = {
  title: { default: "전생·환생 뽑기", template: "%s | 전생·환생 뽑기" },
  description: "나는 전생에 뭐였을까? 다음 생엔 뭐로 태어날까? 세계지도 위에서 뽑아보세요.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={`${sans.variable} ${serif.variable}`}>
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}

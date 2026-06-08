import type { Metadata } from "next";
import { DotGothic16 } from "next/font/google";
import "./globals.css";
// [收集系統] 全域取得物品對話層；任意頁呼叫 acquireCollectible 時顯示
import CollectibleProviders from "@/components/collectibles/CollectibleProviders";
import PageFadeOverlay from "@/components/navigation/PageFadeOverlay";
import UiSoundProvider from "@/components/ui/UiSoundProvider";

const dotGothic = DotGothic16({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-dot-gothic",
});

export const metadata: Metadata = {
  title: "無人夜市",
  description: "2005年6月，無人夜市的畢業旅行",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant" className={`${dotGothic.variable} h-full`}>
      <body className="scanlines noise-overlay min-h-full flex flex-col antialiased">
        {children}
        <PageFadeOverlay />
        <UiSoundProvider />
        <CollectibleProviders />
      </body>
    </html>
  );
}

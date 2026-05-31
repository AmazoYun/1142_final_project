import type { Metadata } from "next";
import { DotGothic16 } from "next/font/google";
import "./globals.css";

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
      </body>
    </html>
  );
}

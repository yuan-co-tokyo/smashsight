import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "smashsight",
  description: "テニスのプレーを動画で振り返る分析アプリ。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}

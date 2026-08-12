import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "飲食店開業セミナー ワークシート",
  description: "飲食店開業セミナーのワークで使用するアプリです。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}

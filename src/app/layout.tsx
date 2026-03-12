import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "絶望の中抜きパチンコ - 多重下請け（SES）シミュレーター",
  description: "案件単価150万円が、あなたの銀行口座に届くまでにいくら削られるか。SES業界の闇を体感せよ。",
  openGraph: {
    title: "絶望の中抜きパチンコ",
    description: "月150万の案件があなたに届くまでの絶望的な旅路。",
    images: ["/api/og"],
  },
  twitter: {
    card: "summary_large_image",
    title: "絶望の中抜きパチンコ",
    description: "月150万の案件があなたに届くまでの絶望的な旅路。",
    images: ["/api/og"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${inter.variable} ${outfit.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}

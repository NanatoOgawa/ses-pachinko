import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Next.js Buzz App Template",
  description: "Create your next viral app in minutes with this high-performance template.",
  openGraph: {
    title: "Next.js Buzz App Template",
    description: "Build your next viral app today!",
    images: ["/api/og"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Next.js Buzz App Template",
    description: "Build your next viral app today!",
    images: ["/api/og"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}

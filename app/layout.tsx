import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "インコ占い｜もしあなたがインコだったら？",
  description: "10の質問でわかる！あなたのインコ型診断。631本のリアルインコ動画データから生まれた本格占いアプリ。",
  openGraph: {
    title: "インコ占い｜もしあなたがインコだったら？",
    description: "10の質問でわかる！あなたのインコ型診断。",
    url: "https://inco-uranai.vercel.app",
    siteName: "インコ占い",
    locale: "ja_JP",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <footer className="py-4 text-center text-xs text-emerald-400 bg-gradient-to-b from-teal-100 to-teal-200">
          <a href="/privacy-policy" className="hover:underline">プライバシーポリシー</a>
          <span className="mx-2">|</span>
          <span>© 2026 インコ占い</span>
        </footer>
      </body>
    </html>
  );
}

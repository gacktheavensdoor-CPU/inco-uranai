import type { Metadata } from "next";
import Link from "next/link";

const AFFILIATE_ITEMS = [
  { label: "🌾 インコのごはん（ペレット）", query: "インコ ペレット 餌" },
  { label: "🎾 インコのおもちゃ", query: "インコ おもちゃ 遊び" },
  { label: "🏠 インコ用ケージ", query: "インコ ケージ" },
];

function makeAmazonUrl(query: string) {
  return `https://www.amazon.co.jp/s?k=${encodeURIComponent(query)}&tag=incouranai-22`;
}

type Props = {
  searchParams: Promise<{ [key: string]: string | undefined }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const type = params.type ?? "インコ型";
  const emoji = params.emoji ?? "🦜";
  const color = params.color ?? "#2ECC71";
  const archetype = params.archetype ?? "";
  const isHidden = params.hidden === "1";

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://inco-uranai.vercel.app";
  const ogUrl = `${baseUrl}/api/og?type=${encodeURIComponent(type)}&emoji=${encodeURIComponent(emoji)}&color=${encodeURIComponent(color)}&archetype=${encodeURIComponent(archetype)}&hidden=${isHidden ? "1" : "0"}`;

  const title = isHidden
    ? `【隠しキャラ解放！】私は「${type}」でした ${emoji}`
    : `私は「${type}」でした ${emoji} | インコ占い`;

  return {
    title,
    description: archetype ? `${archetype} — インコと暮らすズボラ夫婦チャンネル公式診断` : "インコ占いで診断してみよう！",
    openGraph: {
      title,
      description: "10の質問であなたのインコ型を診断！",
      images: [{ url: ogUrl, width: 1200, height: 630 }],
      url: `${baseUrl}/share`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: "10の質問であなたのインコ型を診断！",
      images: [ogUrl],
    },
  };
}

export default async function SharePage({ searchParams }: Props) {
  const params = await searchParams;
  const type = params.type ?? "インコ型";
  const emoji = params.emoji ?? "🦜";
  const archetype = params.archetype ?? "";
  const isHidden = params.hidden === "1";

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 to-teal-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        {isHidden && (
          <div className="bg-yellow-100 border border-yellow-300 text-yellow-700 text-sm font-bold px-4 py-2 rounded-full inline-block mb-4">
            ✨ 隠しキャラ解放！
          </div>
        )}
        <div className="text-8xl mb-4">{emoji}</div>
        {archetype && (
          <p className="text-emerald-600 font-bold mb-2">{archetype}</p>
        )}
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          「{type}」
        </h1>
        <p className="text-gray-500 text-sm mb-6">
          あなたも診断してみよう！
        </p>
        <Link
          href="/"
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 px-10 rounded-full text-lg shadow-lg transition-all inline-block mb-8"
        >
          診断スタート 🐦
        </Link>

        <div className="w-full max-w-sm bg-white rounded-2xl shadow p-4 text-left">
          <p className="text-xs font-bold text-amber-600 mb-3">🛒 インコと暮らすグッズ <span className="text-gray-400 font-normal">（広告）</span></p>
          <div className="space-y-2">
            {AFFILIATE_ITEMS.map((item, i) => (
              <a
                key={i}
                href={makeAmazonUrl(item.query)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between w-full bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg px-3 py-2 text-sm text-gray-700 transition-all"
              >
                <span>{item.label}</span>
                <span className="text-amber-500 text-xs">Amazon →</span>
              </a>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">※ Amazonアソシエイトリンクを含みます</p>
        </div>
      </div>
    </main>
  );
}

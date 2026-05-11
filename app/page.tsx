"use client";
import { useState, useEffect } from "react";
import { QUESTIONS } from "@/lib/questions";

const AFFILIATE_MAP: { keywords: string[]; products: { label: string; query: string }[] }[] = [
  {
    keywords: ["セキセイ"],
    products: [
      { label: "🌾 セキセイインコのごはん", query: "セキセイインコ 餌" },
      { label: "🎾 セキセイインコのおもちゃ", query: "セキセイインコ おもちゃ" },
      { label: "🏠 インコ用ケージ", query: "インコ ケージ 小型" },
    ],
  },
  {
    keywords: ["オカメ"],
    products: [
      { label: "🍎 オカメインコのおやつ", query: "オカメインコ おやつ" },
      { label: "🎾 オカメインコのおもちゃ", query: "オカメインコ おもちゃ" },
      { label: "🏠 オカメ用ケージ", query: "オカメインコ ケージ" },
    ],
  },
  {
    keywords: ["コザクラ"],
    products: [
      { label: "💕 コザクラインコのグッズ", query: "コザクラインコ グッズ" },
      { label: "🎾 インコのおもちゃ", query: "インコ おもちゃ 遊び" },
      { label: "🏠 インコ用ケージ", query: "インコ ケージ" },
    ],
  },
  {
    keywords: ["モモイロ"],
    products: [
      { label: "🦜 モモイロインコのグッズ", query: "モモイロインコ グッズ" },
      { label: "🏠 大型インコ用ケージ", query: "インコ ケージ 大型" },
      { label: "🎾 大型インコのおもちゃ", query: "オウム インコ おもちゃ 大型" },
    ],
  },
  {
    keywords: ["ボタン"],
    products: [
      { label: "💜 ボタンインコのグッズ", query: "ボタンインコ グッズ" },
      { label: "🎾 インコのおもちゃ", query: "インコ おもちゃ" },
      { label: "🏠 インコ用ケージ", query: "インコ ケージ 小型" },
    ],
  },
  {
    keywords: ["ヨウム", "ヨ"],
    products: [
      { label: "🧠 ヨウムの知育おもちゃ", query: "ヨウム おもちゃ 知育" },
      { label: "🏠 大型インコ用ケージ", query: "オウム ケージ 大型" },
      { label: "🍎 大型インコのおやつ", query: "オウム インコ おやつ" },
    ],
  },
];

function getAffiliateItems(incoType: string) {
  for (const item of AFFILIATE_MAP) {
    if (item.keywords.some((k) => incoType.includes(k))) return item.products;
  }
  return [
    { label: "🦜 インコのおもちゃ", query: "インコ おもちゃ" },
    { label: "🌾 インコのごはん", query: "インコ 餌 ペレット" },
    { label: "🏠 インコ用ケージ", query: "インコ ケージ" },
  ];
}

function makeAmazonUrl(query: string) {
  return `https://www.amazon.co.jp/s?k=${encodeURIComponent(query)}&tag=incouranai-22`;
}

function validateColor(color: unknown): string {
  if (typeof color === "string" && /^#[0-9A-Fa-f]{6}$/.test(color)) return color;
  return "#2ECC71";
}

type Result = {
  inco_type: string;
  inco_emoji: string;
  color_theme: string;
  archetype: string;
  description: string;
  traits: string[];
  love_message: string;
  lucky_color: string;
  lucky_item: string;
  compatibility: string;
  compatibility_reason: string;
  share_text: string;
  hidden?: boolean;
};

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-sm px-5 py-3 rounded-full shadow-lg z-50 animate-bounce">
      {message}
    </div>
  );
}

export default function Home() {
  const [step, setStep] = useState<"top" | "quiz" | "loading" | "result">("top");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<{ question: string; answer: string }[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [lastAnswers, setLastAnswers] = useState<{ question: string; answer: string }[]>([]);
  const [showSharePanel, setShowSharePanel] = useState(false);

  const submitDiagnosis = async (finalAnswers: { question: string; answer: string }[]) => {
    setStep("loading");
    setError(null);
    try {
      const res = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: finalAnswers }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "エラーが発生しました");
        setStep("quiz");
        return;
      }
      setResult(data);
      setStep("result");
    } catch {
      setError("通信エラーが発生しました。もう一度お試しください。");
      setStep("quiz");
    }
  };

  const handleAnswer = async (option: string) => {
    setError(null);
    const newAnswers = [...answers, { question: QUESTIONS[current].question, answer: option }];
    setAnswers(newAnswers);

    if (current + 1 < QUESTIONS.length) {
      setCurrent(current + 1);
    } else {
      setLastAnswers(newAnswers);
      await submitDiagnosis(newAnswers);
    }
  };

  const handleRetry = () => submitDiagnosis(lastAnswers);

  const reset = () => {
    setStep("top");
    setCurrent(0);
    setAnswers([]);
    setResult(null);
    setError(null);
    setLastAnswers([]);
  };

  const buildShareData = (result: Result) => {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    const params = new URLSearchParams({
      type: result.inco_type,
      emoji: result.inco_emoji ?? "🦜",
      color: result.color_theme,
      archetype: result.archetype ?? "",
      ...(result.hidden ? { hidden: "1" } : {}),
    });
    const shareUrl = `${base}/share?${params.toString()}`;
    const text = `${result.share_text ?? ""}\n\n#インコ占い #もしあなたがインコだったら`;
    return { shareUrl, text };
  };

  const handleShareX = (result: Result) => {
    const { shareUrl, text } = buildShareData(result);
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`,
      "_blank", "noopener,noreferrer"
    );
  };

  const handleShareLine = (result: Result) => {
    const { shareUrl, text } = buildShareData(result);
    window.open(
      `https://line.me/R/msg/text/?${encodeURIComponent(text + "\n" + shareUrl)}`,
      "_blank", "noopener,noreferrer"
    );
  };

  const handleCopyUrl = async (result: Result) => {
    const { shareUrl } = buildShareData(result);
    try {
      await navigator.clipboard.writeText(shareUrl);
      setToast("URLをコピーしました！SNSに貼り付けてシェアしてください🦜");
    } catch {
      setToast("コピーできませんでした");
    }
    setShowSharePanel(false);
  };

  const handleShareNative = async (result: Result) => {
    const { shareUrl, text } = buildShareData(result);
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: `インコ占い｜${result.inco_type}`, text, url: shareUrl });
        return;
      } catch { /* キャンセル時は何もしない */ }
    }
    setShowSharePanel(true);
  };

  if (step === "top") {
    return (
      <main className="min-h-screen bg-gradient-to-b from-emerald-50 to-teal-100 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="text-8xl mb-6">🦜</div>
          <h1 className="text-3xl font-bold text-emerald-800 mb-2">
            もしあなたがインコだったら？
          </h1>
          <p className="text-emerald-600 mb-2">10の質問であなたのインコ型を診断</p>
          <p className="text-sm text-emerald-500 mb-8">631本のリアルインコ動画から生まれた診断</p>
          <button
            onClick={() => setStep("quiz")}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 px-10 rounded-full text-lg shadow-lg transition-all active:scale-95"
          >
            診断スタート 🐦
          </button>
        </div>
      </main>
    );
  }

  if (step === "quiz") {
    const q = QUESTIONS[current];
    const progress = ((current + 1) / QUESTIONS.length) * 100;
    return (
      <main className="min-h-screen bg-gradient-to-b from-emerald-50 to-teal-100 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="mb-6">
            <div className="flex justify-between text-sm text-emerald-600 mb-2">
              <span>Q{current + 1} / {QUESTIONS.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-emerald-200 rounded-full h-2">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl p-3 mb-4 text-center">
              {error}
              {lastAnswers.length === QUESTIONS.length && (
                <button
                  onClick={handleRetry}
                  className="ml-2 underline font-bold"
                >
                  再診断する
                </button>
              )}
            </div>
          )}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <p className="text-lg font-bold text-gray-800 mb-6 text-center">{q.question}</p>
            <div className="space-y-3">
              {q.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(opt)}
                  className="w-full text-left bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-200 hover:border-emerald-400 rounded-xl p-4 text-gray-700 transition-all active:scale-95"
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (step === "loading") {
    return (
      <main className="min-h-screen bg-gradient-to-b from-emerald-50 to-teal-100 flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🦜</div>
          <p className="text-emerald-700 font-bold text-lg">インコ占い師が鑑定中...</p>
          <p className="text-emerald-500 text-sm mt-2">631本の動画データを解析しています</p>
        </div>
      </main>
    );
  }

  if (step === "result" && result) {
    const color = validateColor(result.color_theme);
    const traits = Array.isArray(result.traits) ? result.traits : [];
    return (
      <main className="min-h-screen bg-gradient-to-b from-emerald-50 to-teal-100 flex flex-col items-center justify-center p-6">
        {toast && <Toast message={toast} onDone={() => setToast(null)} />}
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-4">
            <div className="p-6 text-center text-white" style={{ backgroundColor: color }}>
              <div className="text-6xl mb-3">{result.inco_emoji ?? "🦜"}</div>
              <div className="inline-block bg-white bg-opacity-20 text-white text-sm font-bold px-3 py-1 rounded-full mb-2">
                {result.archetype ?? ""}
              </div>
              <h2 className="text-2xl font-bold mt-2">
                あなたは「{result.inco_type ?? ""}」
              </h2>
            </div>

            <div className="p-6">
              <p className="text-gray-600 text-sm leading-relaxed mb-5">{result.description ?? ""}</p>

              {traits.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-5">
                  {traits.map((t, i) => (
                    <span key={i} className="text-white text-xs font-bold px-3 py-1 rounded-full" style={{ backgroundColor: color }}>
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              <div className="bg-pink-50 rounded-xl p-4 mb-3">
                <p className="text-xs font-bold text-pink-500 mb-1">💕 恋愛・人間関係</p>
                <p className="text-sm text-gray-700">{result.love_message ?? ""}</p>
              </div>

              <div className="bg-purple-50 rounded-xl p-4 mb-3">
                <p className="text-xs font-bold text-purple-500 mb-1">🦜 相性インコ</p>
                <p className="text-sm font-bold text-gray-800">{result.compatibility ?? ""}</p>
                <p className="text-xs text-gray-500 mt-1">{result.compatibility_reason ?? ""}</p>
              </div>

              <div className="flex gap-3 mb-4">
                <div className="flex-1 bg-yellow-50 rounded-xl p-3">
                  <p className="text-xs font-bold text-yellow-600 mb-1">🎨 ラッキーカラー</p>
                  <p className="text-xs text-gray-700">{result.lucky_color ?? ""}</p>
                </div>
                <div className="flex-1 bg-green-50 rounded-xl p-3">
                  <p className="text-xs font-bold text-green-600 mb-1">🍀 ラッキーアイテム</p>
                  <p className="text-xs text-gray-700">{result.lucky_item ?? ""}</p>
                </div>
              </div>

              <div className="bg-amber-50 rounded-xl p-4 mb-4">
                <p className="text-xs font-bold text-amber-600 mb-2">🛒 あなたのタイプにおすすめのグッズ <span className="text-gray-400 font-normal">（広告）</span></p>
                <div className="space-y-2">
                  {getAffiliateItems(result.inco_type ?? "").map((item, i) => (
                    <a
                      key={i}
                      href={makeAmazonUrl(item.query)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between w-full bg-white border border-amber-200 hover:border-amber-400 rounded-lg px-3 py-2 text-sm text-gray-700 hover:text-amber-700 transition-all"
                    >
                      <span>{item.label}</span>
                      <span className="text-amber-400 text-xs">Amazon →</span>
                    </a>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">※ Amazonアソシエイトリンクを含みます</p>
              </div>

              {!showSharePanel ? (
                <button
                  onClick={() => handleShareNative(result)}
                  className="w-full text-white font-bold py-3 rounded-xl transition-all active:scale-95 mb-3"
                  style={{ backgroundColor: color }}
                >
                  結果をシェアする 🐦
                </button>
              ) : (
                <div className="rounded-xl overflow-hidden mb-3 border-2" style={{ borderColor: color }}>
                  <p className="text-center text-xs font-bold py-2 text-white" style={{ backgroundColor: color }}>
                    シェア方法を選んでください
                  </p>
                  <button
                    onClick={() => handleShareX(result)}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-black hover:bg-gray-900 text-white font-bold transition-all border-b border-gray-800"
                  >
                    <span className="text-lg">𝕏</span>
                    <span>Xでシェア</span>
                    <span className="ml-auto text-xs text-gray-400">OG画像付き</span>
                  </button>
                  <button
                    onClick={() => handleShareLine(result)}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-[#06C755] hover:bg-[#05b34c] text-white font-bold transition-all border-b border-green-600"
                  >
                    <span className="text-lg">💬</span>
                    <span>LINEでシェア</span>
                  </button>
                  <button
                    onClick={() => handleCopyUrl(result)}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold transition-all"
                  >
                    <span className="text-lg">🔗</span>
                    <span>URLをコピー</span>
                  </button>
                </div>
              )}
              <button
                onClick={reset}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-3 rounded-xl transition-all active:scale-95"
              >
                もう一度診断する
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return null;
}

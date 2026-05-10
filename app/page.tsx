"use client";
import { useState } from "react";

const QUESTIONS = [
  {
    question: "休日、あなたはどう過ごす？",
    options: [
      "友達と賑やかに過ごす",
      "大好きな人とゆっくり二人きり",
      "一人で新しいことを探索",
      "のんびり家でリラックス",
    ],
  },
  {
    question: "好きな人ができたら？",
    options: [
      "すぐにアピールして気持ちを伝える",
      "そっと寄り添いながらじっくり距離を縮める",
      "相手のことを知りたくて質問攻め",
      "ライバルが現れると燃えてしまう",
    ],
  },
  {
    question: "ストレスが溜まったら？",
    options: [
      "大声で話したり歌ったりして発散",
      "信頼できる人にひたすら甘える",
      "新しい趣味や場所で気分転換",
      "静かにこもって一人で解消",
    ],
  },
  {
    question: "あなたのコミュニケーション方法は？",
    options: [
      "気づいたらずっと喋っている",
      "少数の人と深く繋がりたい",
      "相手の話をよく聞く方",
      "状況を読んで慎重に話す",
    ],
  },
  {
    question: "大好きな食べ物を前にしたら？",
    options: [
      "思わず声が出るほど喜ぶ",
      "大切な人に分けてあげたくなる",
      "初めての味も積極的に試してみる",
      "じっくり味わって大切に食べる",
    ],
  },
  {
    question: "一人でいる時間は？",
    options: [
      "寂しくて誰かを呼びたくなる",
      "大好きな人の顔が浮かんで会いたくなる",
      "新しい発見があって楽しめる",
      "のんびりできて充実している",
    ],
  },
  {
    question: "大切な人が他の人と仲良くしていたら？",
    options: [
      "気にしない、みんなと仲良くしてほしい",
      "すごく気になってモヤモヤしてしまう",
      "二人のことが気になって調べてしまう",
      "内心は寂しいが表には出さない",
    ],
  },
  {
    question: "新しい環境や挑戦を前にしたら？",
    options: [
      "わくわくして飛び込む",
      "信頼できる人が一緒なら挑戦できる",
      "じっくり情報を集めてから判断する",
      "慎重になって時間が必要",
    ],
  },
  {
    question: "嬉しいことがあったら？",
    options: [
      "周りの人全員に話したくなる",
      "大切な人だけに伝えたい",
      "どう表現しようか考えてしまう",
      "自分の中でじっくり噛み締める",
    ],
  },
  {
    question: "あなたの愛情表現は？",
    options: [
      "言葉にして積極的に伝える",
      "ずっとそばにいることで示す",
      "相手が喜ぶことを考えて行動する",
      "照れてなかなか言えないけど心では深く思っている",
    ],
  },
];

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
};

export default function Home() {
  const [step, setStep] = useState<"top" | "quiz" | "loading" | "result">("top");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<{ question: string; answer: string }[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnswer = async (option: string) => {
    const newAnswers = [...answers, { question: QUESTIONS[current].question, answer: option }];
    setAnswers(newAnswers);

    if (current + 1 < QUESTIONS.length) {
      setCurrent(current + 1);
    } else {
      setStep("loading");
      setError(null);
      try {
        const res = await fetch("/api/diagnose", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: newAnswers }),
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
    }
  };

  const reset = () => {
    setStep("top");
    setCurrent(0);
    setAnswers([]);
    setResult(null);
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
    const progress = (current / QUESTIONS.length) * 100;
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
    const color = result.color_theme || "#2ECC71";
    return (
      <main className="min-h-screen bg-gradient-to-b from-emerald-50 to-teal-100 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-4">
            {/* カラーヘッダー */}
            <div className="p-6 text-center text-white" style={{ backgroundColor: color }}>
              <div className="text-6xl mb-3">{result.inco_emoji}</div>
              <div className="inline-block bg-white bg-opacity-20 text-white text-sm font-bold px-3 py-1 rounded-full mb-2">
                {result.archetype}
              </div>
              <h2 className="text-2xl font-bold mt-2">
                あなたは「{result.inco_type}」
              </h2>
            </div>

            <div className="p-6">
              <p className="text-gray-600 text-sm leading-relaxed mb-5">{result.description}</p>

              <div className="flex flex-wrap gap-2 mb-5">
                {result.traits.map((t, i) => (
                  <span key={i} className="text-white text-xs font-bold px-3 py-1 rounded-full" style={{ backgroundColor: color }}>
                    #{t}
                  </span>
                ))}
              </div>

              <div className="bg-pink-50 rounded-xl p-4 mb-3">
                <p className="text-xs font-bold text-pink-500 mb-1">💕 恋愛・人間関係</p>
                <p className="text-sm text-gray-700">{result.love_message}</p>
              </div>

              <div className="bg-purple-50 rounded-xl p-4 mb-3">
                <p className="text-xs font-bold text-purple-500 mb-1">🦜 相性インコ</p>
                <p className="text-sm font-bold text-gray-800">{result.compatibility}</p>
                <p className="text-xs text-gray-500 mt-1">{result.compatibility_reason}</p>
              </div>

              <div className="flex gap-3 mb-6">
                <div className="flex-1 bg-yellow-50 rounded-xl p-3">
                  <p className="text-xs font-bold text-yellow-600 mb-1">🎨 ラッキーカラー</p>
                  <p className="text-xs text-gray-700">{result.lucky_color}</p>
                </div>
                <div className="flex-1 bg-green-50 rounded-xl p-3">
                  <p className="text-xs font-bold text-green-600 mb-1">🍀 ラッキーアイテム</p>
                  <p className="text-xs text-gray-700">{result.lucky_item}</p>
                </div>
              </div>

              <div className="bg-amber-50 rounded-xl p-4 mb-4">
                <p className="text-xs font-bold text-amber-600 mb-2">🛒 あなたのタイプにおすすめのグッズ</p>
                <div className="space-y-2">
                  {getAffiliateItems(result.inco_type).map((item, i) => (
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

              <button
                onClick={() => {
                  const text = `${result.share_text}\n\n#インコ占い #もしあなたがインコだったら`;
                  navigator.clipboard.writeText(text);
                  alert("コピーしました！SNSに貼り付けてシェアしてください🦜");
                }}
                className="w-full text-white font-bold py-3 rounded-xl transition-all active:scale-95 mb-3"
                style={{ backgroundColor: color }}
              >
                結果をシェアする 🐦
              </button>
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
}

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { validateAnswers, type Answer } from "@/lib/questions";

// 隠しキャラ解放条件（5問すべて一致で解放）
const HIDDEN_TSUKUNE: { q: string; a: string }[] = [
  { q: "休日、あなたはどう過ごす？", a: "友達と賑やかに過ごす" },
  { q: "大好きな食べ物を前にしたら？", a: "思わず声が出るほど喜ぶ" },
  { q: "一人でいる時間は？", a: "寂しくて誰かを呼びたくなる" },
  { q: "嬉しいことがあったら？", a: "周りの人全員に話したくなる" },
  { q: "あなたの愛情表現は？", a: "言葉にして積極的に伝える" },
];

const HIDDEN_OIMO: { q: string; a: string }[] = [
  { q: "休日、あなたはどう過ごす？", a: "のんびり家でリラックス" },
  { q: "好きな人ができたら？", a: "そっと寄り添いながらじっくり距離を縮める" },
  { q: "大好きな食べ物を前にしたら？", a: "大切な人に分けてあげたくなる" },
  { q: "一人でいる時間は？", a: "大好きな人の顔が浮かんで会いたくなる" },
  { q: "あなたの愛情表現は？", a: "ずっとそばにいることで示す" },
];

function checkHiddenChar(answers: Answer[]): Record<string, unknown> | null {
  const dbDir = path.join(process.cwd(), "data");
  const answerMap = new Map(answers.map((a) => [a.question, a.answer]));

  if (HIDDEN_TSUKUNE.every((c) => answerMap.get(c.q) === c.a)) {
    const f = path.join(dbDir, "つくね_hidden.json");
    if (fs.existsSync(f)) return { ...JSON.parse(fs.readFileSync(f, "utf-8")), hidden: true };
  }
  if (HIDDEN_OIMO.every((c) => answerMap.get(c.q) === c.a)) {
    const f = path.join(dbDir, "おいも_hidden.json");
    if (fs.existsSync(f)) return { ...JSON.parse(fs.readFileSync(f, "utf-8")), hidden: true };
  }
  return null;
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// 分散レートリミット（Upstash Redis）。リクエスト時に遅延初期化
let ratelimit: Ratelimit | null = null;
function getRatelimit(): Ratelimit | null {
  if (ratelimit) return ratelimit;
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (url?.startsWith("https://") && token) {
    try {
      ratelimit = new Ratelimit({
        redis: new Redis({ url, token }),
        limiter: Ratelimit.slidingWindow(10, "60 s"),
        prefix: "inco-uranai",
      });
    } catch {
      // 初期化失敗時はインメモリフォールバック
    }
  }
  return ratelimit;
}

// インメモリフォールバック（Serverless では近似的な制限のみ）
const memoryLimit = new Map<string, { count: number; reset: number }>();
function checkMemoryLimit(ip: string): boolean {
  const now = Date.now();
  const limit = memoryLimit.get(ip);
  if (!limit || now > limit.reset) {
    memoryLimit.set(ip, { count: 1, reset: now + 60000 });
    return true;
  }
  if (limit.count >= 10) return false;
  limit.count++;
  return true;
}

function getClientIp(req: NextRequest): string {
  // 最左のIPを取得（プロキシチェーンの偽装を防ぐ）
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

// データベースはモジュール起動時に1回だけ読み込む（リクエストごとのI/O削減）
const PROFILES = (() => {
  const dbDir = path.join(process.cwd(), "data");
  const species = ["セキセイ", "オカメ", "コザクラ", "モモイロ", "ボタン", "ヨ"];
  const profiles: Record<string, unknown>[] = [];
  for (const s of species) {
    const f = path.join(dbDir, `${s}_profile.json`);
    if (fs.existsSync(f)) profiles.push(JSON.parse(fs.readFileSync(f, "utf-8")));
  }
  return profiles;
})();

// ============================================================
// 投票方式でインコを選ぶ（各回答が1位票2点・2位票1点を持つ）
// 10問でどのインコに一番票が集まったかで決定する
// ============================================================

// 各回答 → {primary: 1位インコ, secondary: 2位インコ}
// 各プロファイルが10問中6〜7問で1位票を持つよう均等に配分
const ANSWER_VOTES: Record<string, { primary: string; secondary: string }> = {
  // Q1: 休日
  "友達と賑やかに過ごす":                           { primary: "セキセイインコ",  secondary: "モモイロインコ" },
  "大好きな人とゆっくり二人きり":                   { primary: "コザクラインコ",   secondary: "オカメインコ" },
  "一人で新しいことを探索":                         { primary: "ヨウム",           secondary: "ボタンインコ" },
  "のんびり家でリラックス":                         { primary: "ボタンインコ",     secondary: "オカメインコ" },
  // Q2: 好きな人
  "すぐにアピールして気持ちを伝える":               { primary: "セキセイインコ",  secondary: "モモイロインコ" },
  "そっと寄り添いながらじっくり距離を縮める":       { primary: "オカメインコ",    secondary: "コザクラインコ" },
  "相手のことを知りたくて質問攻め":                 { primary: "ヨウム",           secondary: "セキセイインコ" },
  "ライバルが現れると燃えてしまう":                 { primary: "モモイロインコ",   secondary: "セキセイインコ" },
  // Q3: ストレス
  "大声で話したり歌ったりして発散":                 { primary: "セキセイインコ",  secondary: "モモイロインコ" },
  "信頼できる人にひたすら甘える":                   { primary: "コザクラインコ",   secondary: "オカメインコ" },
  "新しい趣味や場所で気分転換":                     { primary: "モモイロインコ",   secondary: "セキセイインコ" },
  "静かにこもって一人で解消":                       { primary: "ヨウム",           secondary: "ボタンインコ" },
  // Q4: コミュニケーション
  "気づいたらずっと喋っている":                     { primary: "セキセイインコ",  secondary: "モモイロインコ" },
  "少数の人と深く繋がりたい":                       { primary: "コザクラインコ",   secondary: "オカメインコ" },
  "相手の話をよく聞く方":                           { primary: "オカメインコ",    secondary: "コザクラインコ" },
  "状況を読んで慎重に話す":                         { primary: "ヨウム",           secondary: "ボタンインコ" },
  // Q5: 食べ物
  "思わず声が出るほど喜ぶ":                         { primary: "モモイロインコ",   secondary: "セキセイインコ" },
  "大切な人に分けてあげたくなる":                   { primary: "コザクラインコ",   secondary: "オカメインコ" },
  "初めての味も積極的に試してみる":                 { primary: "セキセイインコ",  secondary: "モモイロインコ" },
  "じっくり味わって大切に食べる":                   { primary: "オカメインコ",    secondary: "ヨウム" },
  // Q6: 一人の時間
  "寂しくて誰かを呼びたくなる":                     { primary: "コザクラインコ",   secondary: "オカメインコ" },
  "大好きな人の顔が浮かんで会いたくなる":           { primary: "オカメインコ",    secondary: "コザクラインコ" },
  "新しい発見があって楽しめる":                     { primary: "ヨウム",           secondary: "ボタンインコ" },
  "のんびりできて充実している":                     { primary: "ボタンインコ",     secondary: "ヨウム" },
  // Q7: 大切な人が他の人と
  "気にしない、みんなと仲良くしてほしい":           { primary: "セキセイインコ",  secondary: "モモイロインコ" },
  "すごく気になってモヤモヤしてしまう":             { primary: "ボタンインコ",     secondary: "コザクラインコ" },
  "二人のことが気になって調べてしまう":             { primary: "ヨウム",           secondary: "ボタンインコ" },
  "内心は寂しいが表には出さない":                   { primary: "オカメインコ",    secondary: "コザクラインコ" },
  // Q8: 新しい環境
  "わくわくして飛び込む":                           { primary: "モモイロインコ",   secondary: "セキセイインコ" },
  "信頼できる人が一緒なら挑戦できる":               { primary: "オカメインコ",    secondary: "コザクラインコ" },
  "じっくり情報を集めてから判断する":               { primary: "ヨウム",           secondary: "ボタンインコ" },
  "慎重になって時間が必要":                         { primary: "ボタンインコ",     secondary: "オカメインコ" },
  // Q9: 嬉しいこと
  "周りの人全員に話したくなる":                     { primary: "モモイロインコ",   secondary: "セキセイインコ" },
  "大切な人だけに伝えたい":                         { primary: "コザクラインコ",   secondary: "オカメインコ" },
  "どう表現しようか考えてしまう":                   { primary: "オカメインコ",    secondary: "ヨウム" },
  "自分の中でじっくり噛み締める":                   { primary: "ボタンインコ",     secondary: "ヨウム" },
  // Q10: 愛情表現
  "言葉にして積極的に伝える":                       { primary: "セキセイインコ",  secondary: "モモイロインコ" },
  "ずっとそばにいることで示す":                     { primary: "コザクラインコ",   secondary: "オカメインコ" },
  "相手が喜ぶことを考えて行動する":                 { primary: "モモイロインコ",   secondary: "セキセイインコ" },
  "照れてなかなか言えないけど心では深く思っている": { primary: "ボタンインコ",     secondary: "オカメインコ" },
};

// 回答に応じて投票を集計し、最多票のプロファイルを返す
function selectBestProfile(answers: Answer[]): Record<string, unknown> {
  const votes: Record<string, number> = {};
  for (const profile of PROFILES) votes[profile.species as string] = 0;

  for (const a of answers) {
    const v = ANSWER_VOTES[a.answer];
    if (v) {
      votes[v.primary]   = (votes[v.primary]   ?? 0) + 2;
      votes[v.secondary] = (votes[v.secondary] ?? 0) + 1;
    }
  }

  let best = PROFILES[0];
  let maxVotes = -1;
  for (const profile of PROFILES) {
    const score = votes[profile.species as string] ?? 0;
    if (score > maxVotes) { maxVotes = score; best = profile; }
  }
  return best;
}

// ============================================================

function buildPrompt(answers: Answer[], profile: Record<string, unknown>): string {
  return `あなたはインコ占い師です。以下のインコプロファイルと診断回答をもとに、占い結果の文章を生成してください。

## このユーザーに決まったインコタイプ
${JSON.stringify(profile, null, 2)}

## 診断の回答
${answers.map((a, i) => `Q${i + 1}: ${a.question}\n→ ${a.answer}`).join("\n\n")}

## 文章生成ルール
- 比喩は必ず鳥・インコに関連した表現を使う（「社交鳥」「羽を広げる」「さえずる」「羽ばたく」「群れを作る」など）
- 「蝶」「猫」「犬」など他の動物の比喩は一切使わない
- インコらしい愛らしい口調で、楽しくポジティブに描写する
- descriptionはインコの具体的な行動（鳴く・羽ばたく・甘える・つつくなど）で性格を表現する

## 出力形式（JSON、他のテキスト不要）
{
  "inco_type": "${profile.species}型",
  "inco_emoji": "インコに近い絵文字1つ",
  "archetype": "占いキャラクター像（短く・キャッチーに）",
  "description": "200字程度、インコの行動・習性に例えながら楽しく描写",
  "traits": ["特徴1", "特徴2", "特徴3"],
  "love_message": "恋愛・人間関係へのひとこと（50字程度）",
  "lucky_item": "ラッキーアイテム",
  "share_text": "SNSシェア用の一言（インコらしい口調で100字以内）"
}`;
}

async function callDiagnoseApi(answers: Answer[]): Promise<Record<string, unknown>> {
  const profile = selectBestProfile(answers);

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    temperature: 0,
    messages: [{ role: "user", content: buildPrompt(answers, profile) }],
  });

  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("テキストレスポンスがありません");

  const raw = block.text.trim();
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("JSONが見つかりません");

  const generated = JSON.parse(match[0]);

  // プロファイルの固定値はコードから直接セット（AIに任せない）
  return {
    ...generated,
    color_theme: profile.color_theme,
    lucky_color: profile.lucky_color,
    compatibility: profile.compatibility,
    compatibility_reason: profile.compatibility_reason,
  };
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);

    // レートリミット判定
    const rl = getRatelimit();
    if (rl) {
      const { success } = await rl.limit(ip);
      if (!success) {
        return NextResponse.json({ error: "しばらく待ってから試してください" }, { status: 429 });
      }
    } else {
      if (!checkMemoryLimit(ip)) {
        return NextResponse.json({ error: "しばらく待ってから試してください" }, { status: 429 });
      }
    }

    const body = await req.json();
    let answers: Answer[];
    try {
      answers = validateAnswers(body.answers);
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 400 });
    }

    // 隠しキャラ判定（一致すればClaudeを呼ばず即返す）
    const hidden = checkHiddenChar(answers);
    if (hidden) return NextResponse.json(hidden);

    // パース失敗時は1回リトライ
    let result: Record<string, unknown>;
    try {
      result = await callDiagnoseApi(answers);
    } catch {
      result = await callDiagnoseApi(answers);
    }

    // color_themeをバリデーション（CSSインジェクション防止）
    if (typeof result.color_theme === "string" && !/^#[0-9A-Fa-f]{6}$/.test(result.color_theme)) {
      result.color_theme = "#2ECC71";
    }

    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "診断中にエラーが発生しました。もう一度お試しください。" }, { status: 500 });
  }
}

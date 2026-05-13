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
  // ヨウムのファイル名は "ヨ_profile.json"（6文字省略形）
  const species = ["セキセイ", "オカメ", "コザクラ", "モモイロ", "ボタン", "ヨ"];
  const profiles: Record<string, unknown>[] = [];
  for (const s of species) {
    const f = path.join(dbDir, `${s}_profile.json`);
    if (fs.existsSync(f)) profiles.push(JSON.parse(fs.readFileSync(f, "utf-8")));
  }
  return profiles;
})();

// ============================================================
// 答えをもとにインコを選ぶ仕組み（コードで確定させる）
// ============================================================

type DimKey = "sociable" | "independent" | "affectionate" | "playful" | "intelligent" | "sensitive";
type DimScores = Record<DimKey, number>;

// 各回答が持つ性格スコア（各次元に0〜2点）
const ANSWER_SCORES: Record<string, Partial<DimScores>> = {
  // Q1: 休日
  "友達と賑やかに過ごす":                         { sociable: 2, playful: 1 },
  "大好きな人とゆっくり二人きり":                 { affectionate: 2, sensitive: 1 },
  "一人で新しいことを探索":                       { independent: 2, playful: 1, intelligent: 1 },
  "のんびり家でリラックス":                       { sensitive: 2, independent: 1 },
  // Q2: 好きな人
  "すぐにアピールして気持ちを伝える":             { sociable: 2, affectionate: 1, playful: 1 },
  "そっと寄り添いながらじっくり距離を縮める":     { sensitive: 2, intelligent: 1, affectionate: 1 },
  "相手のことを知りたくて質問攻め":               { intelligent: 2, sociable: 1, playful: 1 },
  "ライバルが現れると燃えてしまう":               { playful: 2, sociable: 1, independent: 1 },
  // Q3: ストレス
  "大声で話したり歌ったりして発散":               { sociable: 2, playful: 1 },
  "信頼できる人にひたすら甘える":                 { affectionate: 2, sensitive: 1 },
  "新しい趣味や場所で気分転換":                   { playful: 2, independent: 1, intelligent: 1 },
  "静かにこもって一人で解消":                     { independent: 2, intelligent: 1, sensitive: 1 },
  // Q4: コミュニケーション
  "気づいたらずっと喋っている":                   { sociable: 2, playful: 1 },
  "少数の人と深く繋がりたい":                     { sensitive: 2, affectionate: 1 },
  "相手の話をよく聞く方":                         { sensitive: 2, intelligent: 1, affectionate: 1 },
  "状況を読んで慎重に話す":                       { intelligent: 2, sensitive: 1, independent: 1 },
  // Q5: 食べ物
  "思わず声が出るほど喜ぶ":                       { playful: 2, sociable: 1 },
  "大切な人に分けてあげたくなる":                 { affectionate: 2, sensitive: 1 },
  "初めての味も積極的に試してみる":               { playful: 2, independent: 1, intelligent: 1 },
  "じっくり味わって大切に食べる":                 { sensitive: 2, intelligent: 1, independent: 1 },
  // Q6: 一人の時間
  "寂しくて誰かを呼びたくなる":                   { sociable: 2, affectionate: 1, sensitive: 1 },
  "大好きな人の顔が浮かんで会いたくなる":         { affectionate: 2, sensitive: 1 },
  "新しい発見があって楽しめる":                   { intelligent: 2, independent: 1, playful: 1 },
  "のんびりできて充実している":                   { independent: 2, sensitive: 1 },
  // Q7: 大切な人が他の人と
  "気にしない、みんなと仲良くしてほしい":         { sociable: 2, independent: 1 },
  "すごく気になってモヤモヤしてしまう":           { sensitive: 2, affectionate: 1 },
  "二人のことが気になって調べてしまう":           { intelligent: 2, sensitive: 1, independent: 1 },
  "内心は寂しいが表には出さない":                 { sensitive: 2, intelligent: 1, independent: 1 },
  // Q8: 新しい環境
  "わくわくして飛び込む":                         { playful: 2, sociable: 1, independent: 1 },
  "信頼できる人が一緒なら挑戦できる":             { affectionate: 2, sensitive: 1, sociable: 1 },
  "じっくり情報を集めてから判断する":             { intelligent: 2, sensitive: 1, independent: 1 },
  "慎重になって時間が必要":                       { sensitive: 2, intelligent: 1 },
  // Q9: 嬉しいこと
  "周りの人全員に話したくなる":                   { sociable: 2, playful: 1 },
  "大切な人だけに伝えたい":                       { affectionate: 2, sensitive: 1 },
  "どう表現しようか考えてしまう":                 { intelligent: 2, sensitive: 1 },
  "自分の中でじっくり噛み締める":                 { sensitive: 2, intelligent: 1, independent: 1 },
  // Q10: 愛情表現
  "言葉にして積極的に伝える":                     { sociable: 2, affectionate: 1, playful: 1 },
  "ずっとそばにいることで示す":                   { affectionate: 2, sensitive: 1 },
  "相手が喜ぶことを考えて行動する":               { affectionate: 1, intelligent: 1, playful: 1, sensitive: 1 },
  "照れてなかなか言えないけど心では深く思っている": { sensitive: 2, intelligent: 1, independent: 1 },
};

// 各次元で取りうる最大合計点（正規化に使う）
const DIM_MAX: DimScores = {
  sociable: 18, independent: 13, affectionate: 17,
  playful: 13,  intelligent: 16, sensitive: 18,
};

const DIMS: DimKey[] = ["sociable", "independent", "affectionate", "playful", "intelligent", "sensitive"];

// 10問の回答を集計して性格スコアを算出
function scoreAnswers(answers: Answer[]): DimScores {
  const total: DimScores = { sociable: 0, independent: 0, affectionate: 0, playful: 0, intelligent: 0, sensitive: 0 };
  for (const a of answers) {
    const s = ANSWER_SCORES[a.answer];
    if (s) {
      for (const k of DIMS) total[k] += s[k] ?? 0;
    }
  }
  return total;
}

// 集計スコアに最も近いプロファイルを返す
function selectBestProfile(answers: Answer[]): Record<string, unknown> {
  const raw = scoreAnswers(answers);
  // 0〜10 スケールに揃える
  const norm: DimScores = { sociable: 0, independent: 0, affectionate: 0, playful: 0, intelligent: 0, sensitive: 0 };
  for (const k of DIMS) norm[k] = (raw[k] / DIM_MAX[k]) * 10;

  let best = PROFILES[0];
  let minDist = Infinity;
  for (const profile of PROFILES) {
    const m = profile.human_personality_match as DimScores;
    let dist = 0;
    for (const k of DIMS) dist += Math.pow(norm[k] - m[k], 2);
    if (dist < minDist) { minDist = dist; best = profile; }
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

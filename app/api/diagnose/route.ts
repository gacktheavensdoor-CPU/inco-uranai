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

const PROFILE_SUMMARY = PROFILES.map((p: Record<string, unknown>) => ({
  species: p.species,
  fortune_archetype: p.fortune_archetype,
  personality_traits: p.personality_traits,
  love_style: p.love_style,
  communication_style: p.communication_style,
  unique_characteristics: p.unique_characteristics,
  human_personality_match: p.human_personality_match,
  color_theme: p.color_theme,
  lucky_color: p.lucky_color,
  compatibility: p.compatibility,
  compatibility_reason: p.compatibility_reason,
}));

function buildPrompt(answers: Answer[]): string {
  return `あなたはインコ占い師です。以下のインコデータベースと診断の回答をもとに、その人が「もしインコだったら何インコ型か」を判定してください。

## 重要なルール
- 比喩は必ず鳥・インコに関連した表現を使う（「社交鳥」「羽を広げる」「さえずる」「羽ばたく」「群れを作る」など）
- 「蝶」「猫」「犬」など他の動物の比喩は一切使わない
- インコらしい愛らしい口調で、楽しくポジティブに描写する
- descriptionはインコの具体的な行動（鳴く・羽ばたく・甘える・つつくなど）で性格を表現する
- color_theme・lucky_color・compatibility・compatibility_reasonは必ずデータベースの値をそのまま使う

## インコデータベース
${JSON.stringify(PROFILE_SUMMARY, null, 2)}

## 診断の回答
${answers.map((a, i) => `Q${i + 1}: ${a.question}\n→ ${a.answer}`).join("\n\n")}

## 出力形式（JSON、他のテキスト不要）
{
  "inco_type": "○○インコ型",
  "inco_emoji": "インコに近い絵文字1つ",
  "color_theme": "データベースのcolor_themeをそのまま使う",
  "archetype": "占いキャラクター像（短く・キャッチーに）",
  "description": "200字程度、インコの行動・習性に例えながら楽しく描写",
  "traits": ["特徴1", "特徴2", "特徴3"],
  "love_message": "恋愛・人間関係へのひとこと（50字程度）",
  "lucky_color": "データベースのlucky_colorをそのまま使う",
  "lucky_item": "ラッキーアイテム",
  "compatibility": "データベースのcompatibilityをそのまま使う",
  "compatibility_reason": "データベースのcompatibility_reasonをそのまま使う",
  "share_text": "SNSシェア用の一言（インコらしい口調で100字以内）"
}`;
}

async function callDiagnoseApi(answers: Answer[]): Promise<Record<string, unknown>> {
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1500,
    messages: [{ role: "user", content: buildPrompt(answers) }],
  });

  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("テキストレスポンスがありません");

  // JSONブロックを正規表現で抽出（余計なテキストへの耐性）
  const raw = block.text.trim();
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("JSONが見つかりません");

  return JSON.parse(match[0]);
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

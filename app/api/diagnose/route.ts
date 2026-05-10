import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// シンプルなレート制限（IP別・1分10回まで）
const rateLimit = new Map<string, { count: number; reset: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = rateLimit.get(ip);
  if (!limit || now > limit.reset) {
    rateLimit.set(ip, { count: 1, reset: now + 60000 });
    return true;
  }
  if (limit.count >= 10) return false;
  limit.count++;
  return true;
}

function loadIncoDatabase() {
  const dbDir = path.join(process.cwd(), "data");
  const species = ["セキセイ", "オカメ", "コザクラ", "モモイロ", "ボタン", "ヨ"];
  const profiles: Record<string, unknown>[] = [];
  for (const s of species) {
    const f = path.join(dbDir, `${s}_profile.json`);
    if (fs.existsSync(f)) {
      profiles.push(JSON.parse(fs.readFileSync(f, "utf-8")));
    }
  }
  return profiles;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: "しばらく待ってから試してください" }, { status: 429 });
    }

    const { answers } = await req.json();
    if (!answers || answers.length !== 10) {
      return NextResponse.json({ error: "回答が不正です" }, { status: 400 });
    }

    const profiles = loadIncoDatabase();
    const profileSummary = profiles.map((p: Record<string, unknown>) => ({
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

    const prompt = `あなたはインコ占い師です。以下のインコデータベースと診断の回答をもとに、その人が「もしインコだったら何インコ型か」を判定してください。

## 重要なルール
- 比喩は必ず鳥・インコに関連した表現を使う（「社交鳥」「羽を広げる」「さえずる」「羽ばたく」「群れを作る」など）
- 「蝶」「猫」「犬」など他の動物の比喩は一切使わない
- インコらしい愛らしい口調で、楽しくポジティブに描写する
- descriptionはインコの具体的な行動（鳴く・羽ばたく・甘える・つつくなど）で性格を表現する
- color_theme・lucky_color・compatibility・compatibility_reasonは必ずデータベースの値をそのまま使う

## インコデータベース
${JSON.stringify(profileSummary, null, 2)}

## 診断の回答
${answers.map((a: { question: string; answer: string }, i: number) => `Q${i + 1}: ${a.question}\n→ ${a.answer}`).join("\n\n")}

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

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const text = (response.content[0] as { text: string }).text.trim()
      .replace(/```json\n?/g, "").replace(/```\n?/g, "");

    return NextResponse.json(JSON.parse(text));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "診断中にエラーが発生しました。もう一度お試しください。" }, { status: 500 });
  }
}

export const QUESTIONS = [
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
] as const;

export type Answer = { question: string; answer: string };

const VALID_OPTIONS = new Set(QUESTIONS.flatMap((q) => q.options));

export function validateAnswers(answers: unknown): Answer[] {
  if (!Array.isArray(answers) || answers.length !== 10) {
    throw new Error("回答数が正しくありません");
  }
  return answers.map((a, i) => {
    if (
      typeof a !== "object" ||
      a === null ||
      typeof (a as Record<string, unknown>).question !== "string" ||
      typeof (a as Record<string, unknown>).answer !== "string"
    ) {
      throw new Error(`Q${i + 1}の形式が不正です`);
    }
    const ans = a as Answer;
    if (ans.question.length > 200 || ans.answer.length > 200) {
      throw new Error(`Q${i + 1}の文字数が超過しています`);
    }
    if (!VALID_OPTIONS.has(ans.answer as never)) {
      throw new Error(`Q${i + 1}の回答が選択肢にありません`);
    }
    return { question: ans.question, answer: ans.answer };
  });
}

// 2日目ワーク②「リアルな収支計画を立ててみよう」のAI支援部分。
// ワーク①〜③・2日目ワーク①と同じく、AIは計算も戦略立案もしない。
// 「計算するのは人。戦略を考えるのも人。戦略を数字で点検するのがAI。
// 最後に決めるのは人。」という役割分担を徹底し、AIの役割は
// 参加者が考えた戦略を「数字とのつながり・実行可能性・注意点」の
// 観点で整理することだけに限定している。
//
// 必要客単価・差額の計算はアプリ側（Day2Work2Form）が行い、このファイルは
// (1) 計算ロジック (2) ページ見出し文言 (3) AIへ渡すプロンプトの組み立て、
// の3つだけを担当する。今回のセミナー固有の数字（席数25・客単価2,500円等）は
// 一切ハードコードしない。参加者が課題文を読んで入力した値のみを扱う、
// セミナー後も再利用できる汎用の計算機にするため。

export type Day2Work2Segment = {
  name: string;
  occupancyRate: number; // 満席率（%）
  turnoverRate: number; // 回転数（回転）
  businessDays: number; // 営業日数（日）
};

export type Day2Work2CalcResult = {
  segment1CustomersRaw: number;
  segment2CustomersRaw: number;
  totalCustomersRaw: number;
  segment1CustomersDisplay: number;
  segment2CustomersDisplay: number;
  totalCustomersDisplay: number;
  requiredUnitPriceRaw: number | null;
  requiredUnitPriceDisplay: number | null;
  diffRaw: number | null;
  diffDisplay: number | null;
};

function segmentCustomers(seats: number, segment: Day2Work2Segment): number {
  return seats * (segment.occupancyRate / 100) * segment.turnoverRate * segment.businessDays;
}

const round0 = (n: number) => Math.round(n);
const round10 = (n: number) => Math.round(n / 10) * 10;

// 表示は丸めるが、計算の連鎖（区分客数の合計や必要客単価の算出）は
// 丸める前の数値を使う。区分ごとの表示客数の単純合計と、月間総客数の
// 表示値がずれることがあるのは仕様どおり。
export function calculateDay2Work2(input: {
  targetSales: number;
  seats: number;
  currentUnitPrice: number;
  segment1: Day2Work2Segment;
  segment2: Day2Work2Segment;
}): Day2Work2CalcResult {
  const segment1CustomersRaw = segmentCustomers(input.seats, input.segment1);
  const segment2CustomersRaw = segmentCustomers(input.seats, input.segment2);
  const totalCustomersRaw = segment1CustomersRaw + segment2CustomersRaw;

  const canComputeUnitPrice = totalCustomersRaw > 0;
  const requiredUnitPriceRaw = canComputeUnitPrice
    ? input.targetSales / totalCustomersRaw
    : null;
  const diffRaw =
    requiredUnitPriceRaw !== null ? requiredUnitPriceRaw - input.currentUnitPrice : null;

  return {
    segment1CustomersRaw,
    segment2CustomersRaw,
    totalCustomersRaw,
    segment1CustomersDisplay: round0(segment1CustomersRaw),
    segment2CustomersDisplay: round0(segment2CustomersRaw),
    totalCustomersDisplay: round0(totalCustomersRaw),
    requiredUnitPriceRaw,
    requiredUnitPriceDisplay: requiredUnitPriceRaw !== null ? round10(requiredUnitPriceRaw) : null,
    diffRaw,
    diffDisplay: diffRaw !== null ? round10(diffRaw) : null,
  };
}

export const day2Work2Meta = {
  pageTitle: "ワーク②　収支計画の戦略チェック",
  pageDescription:
    "課題文から目標売上・席数などの数字を読み取って入力してください。必要客単価と、当初想定していた客単価との差をアプリが計算します。その差をどう埋めるか、チームで考えた戦略をAIが数字とのつながりから整理します。",
};

export function buildDay2Work2Prompt(params: {
  targetSales: number;
  seats: number;
  currentUnitPrice: number;
  requiredUnitPriceDisplay: number;
  diffDisplay: number;
  segment1: Day2Work2Segment;
  segment2: Day2Work2Segment;
  strategy1: string;
  strategy2: string;
}): string {
  const {
    targetSales,
    seats,
    currentUnitPrice,
    requiredUnitPriceDisplay,
    diffDisplay,
    segment1,
    segment2,
    strategy1,
    strategy2,
  } = params;

  return `あなたは、飲食店の収支計画を考えるチームの「戦略検証役」です。

私たちは、必要な売上や必要客単価を自分たちで計算し、その数字を達成するための戦略も自分たちで考えました。

あなたの役割は、新しい戦略を考えることではありません。
私たちが考えた戦略を、数字とのつながり・実行可能性・注意点の観点から整理し、私たち自身が最終判断しやすくすることです。

【前提】
・目標売上：${targetSales}円
・席数：${seats}席
・現在想定している客単価：${currentUnitPrice}円
・必要客単価：${requiredUnitPriceDisplay}円
・客単価の差額（必要客単価－現在想定客単価）：${diffDisplay}円
・営業区分「${segment1.name}」：満席率${segment1.occupancyRate}%、回転数${segment1.turnoverRate}回転、営業日数${segment1.businessDays}日
・営業区分「${segment2.name}」：満席率${segment2.occupancyRate}%、回転数${segment2.turnoverRate}回転、営業日数${segment2.businessDays}日

【私たちが考えた戦略】
戦略①：${strategy1}
戦略②：${strategy2}

【お願い】

1. それぞれの戦略が、主に次のどの数字に影響するものか整理してください。
　・客単価
　・客数
　・満席率
　・回転数
　・その他

2. 目標売上・必要客単価とのつながりを整理してください。

3. 戦略を実行するときに考えられる注意点や弱点を整理してください。

4. 戦略①と戦略②の違いを整理してください。

5. 判断するために追加確認が必要なことは「要確認」としてください。

【非常に重要なルール】
・新しい戦略を勝手に追加しない。
・参加者が書いていない具体策を勝手に補完しない。
・売上増加額、注文率、来店客数増加率などを根拠なく推測しない。
・「この戦略なら売上が○円上がる」といった架空の試算をしない。
・戦略①、戦略②のどちらが優れているか順位付けしない。
・「この戦略を採用すべき」「これがベスト」と結論を出さない。
・目標売上や必要客単価を再計算して、参加者の計算を置き換えない。
・入力された数字に明らかな矛盾があっても勝手に修正せず、「要確認」とする。
・一般的な飲食店知識は、戦略を見るためのチェック観点としてのみ使用する。
・戦略①と戦略②を組み合わせる、両方を実施するなど、参加者が入力していない新しい選択肢を提案しない。

【数字の整合性について】
入力された「目標売上」「必要客単価」などの数字が、前提（席数・現在想定している客単価など）との関係で違和感がある場合、または入力情報だけでは整合性を判断できない場合は、あなたが数字を修正したり、正しい数字を計算し直して提示したりしないでください。
その場合は、次のように明示してください。

要確認：この数字の計算根拠をチームで確認してください。

数字の計算根拠を確認するのは私たち自身であり、あなたの役割ではありません。

【回答形式】

①戦略①の整理
・主に影響する数字
・目標数字とのつながり
・注意点
・要確認事項

②戦略②の整理
・主に影響する数字
・目標数字とのつながり
・注意点
・要確認事項

③2つの戦略の違い
判断しやすいように違いだけを整理する。優劣や順位はつけない。

④追加で確認すべきこと

最後に必ず次の問いを表示してください。

「この2案のうち、自分たちのお店のコンセプトと現場での実行しやすさを考えたとき、どちらを採用するかチームで決めてください。」
`;
}

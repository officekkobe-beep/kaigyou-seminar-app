// 2日目ワーク①「厨房設備の比較」。
// ワーク①〜③と異なり、参加者が文章を入力するのではなく、
// 担当する設備を1つ選ぶだけの画面のため、WorkConfig/WorkForm は使わず、
// 「共通プロンプト骨格＋設備別の比較の視点」を持つ専用の設定として管理する。
//
// 無料版ChatGPTの画像アップロード上限を避けるため、商品画像はChatGPTへ送らない。
// 商品画像はブラウザ内のOCR（Tesseract.js）で文字化し、3商品分のOCR結果と
// 比較指示だけをテキストとしてChatGPTに渡す。画像そのものはどこにも送信・
// 保存しない（OcrProductPanel / EquipmentSelectForm 側の実装を参照）。

export type EquipmentId = "fridge" | "dishwasher" | "icemaker" | "gasRange";

type Equipment = {
  id: EquipmentId;
  label: string;
  conditionPoints: string;
  caution: string;
};

const equipments: Equipment[] = [
  {
    id: "fridge",
    label: "業務用縦型冷凍冷蔵庫",
    conditionPoints: `・冷蔵庫か冷凍冷蔵庫か
・容量
・扉数
・サイズ
・電源`,
    caution:
      "各商品が同程度の容量・冷凍冷蔵の構成なのかを確認してください。仕様が大きく違う場合は、価格だけでは単純比較できないことを指摘してください。",
  },
  {
    id: "dishwasher",
    label: "業務用食洗機",
    conditionPoints: `・ドア型かアンダーカウンター型か
・処理能力
・サイズ
・電源
・設置条件`,
    caution:
      "アンダーカウンター型、ドア型など、そもそも種類・能力の違う商品を単純比較していないか確認してください。",
  },
  {
    id: "icemaker",
    label: "業務用製氷機",
    conditionPoints: `・製氷能力
・貯氷量
・サイズ`,
    caution:
      "今回のワークでは25kg程度の製氷機を想定しています。候補に能力が大きく違う商品が混ざっている場合は、「同じ条件の商品ではないため、単純な価格比較はできない」と指摘してください。ただし、候補商品を勝手に変更したり、別の商品をおすすめしたりしないでください。",
  },
  {
    id: "gasRange",
    label: "業務用ガステーブル",
    conditionPoints: `・都市ガス／LPガスか
・バーナー数
・サイズ
・オーブンの有無`,
    caution:
      "都市ガス用／LPガス用、バーナー数、オーブンの有無などが大きく違う商品を、単純に価格だけで比較していないか確認してください。",
  },
];

// 3商品分のOCR結果（画像から読み取った文字）から、比較用プロンプトを組み立てる。
// AIには画像を渡さず、OCRされた文字情報だけを渡す。
function buildComparePrompt(equipment: Equipment, ocrTexts: [string, string, string]): string {
  return `以下は、同じ種類の厨房設備（${equipment.label}）3商品の商品ページを
OCRで文字化した情報です。

OCRのため、文字・型式・数字等に読み取り誤りが
含まれている可能性があります。

【商品① OCR結果】
${ocrTexts[0]}

【商品② OCR結果】
${ocrTexts[1]}

【商品③ OCR結果】
${ocrTexts[2]}

この3商品について、OCR結果に書かれている情報だけを使って比較してください。

比較してほしい項目：
・商品名、型式
・新品／中古
・価格
・年式
・サイズ
・能力、容量、処理能力
・電源、ガス種などの設置条件
・保証
・送料、搬入、設置費
・その他大きな違い
・購入前に確認すべき点

【重要なルール】
・OCR結果にない情報を推測して補わない
・Web検索して情報を追加しない
・数字や型式が不自然な場合は勝手に修正せず「要確認」とする
・複数の読み方が考えられる場合は勝手に1つに決めない
・複数の数値を1つにまとめたり、平均値・代表値を作ったりしない
・単位を変換したり、範囲の数値（例：2〜6L/回）を単一の値に書き換えたりしない
・3商品の違いを分かりやすく整理する
・おすすめ順位を付けない
・どの商品を購入すべきか決めない

【この設備を比較するときに一般的に注意したい点】
${equipment.conditionPoints}
${equipment.caution}

最後に、
「この比較を見て、価格だけでなく性能・サイズ・設置条件・保証なども踏まえ、どの商品を購入するかチームで決めてください。」
と問いかけてください。
`;
}

export const day2Work1Equipments = equipments.map((equipment) => ({
  id: equipment.id,
  label: equipment.label,
  buildComparePrompt: (ocrTexts: [string, string, string]) =>
    buildComparePrompt(equipment, ocrTexts),
}));

export const day2Work1Meta = {
  pageTitle: "ワーク①　厨房設備の比較",
  pageDescription:
    "担当する設備を選び、比較したい3商品のスクリーンショットを選んでください。画像はこの端末のブラウザ内で文字を読み取るためだけに使われ、送信・保存はされません。",
};

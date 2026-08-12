// ワーク共通の型定義。ワーク③以降を追加する際もこの型に沿って
// src/content 配下に設定ファイルを増やすだけでよい構成にしている。

export type QuestionField = {
  id: string;
  label: string;
  help?: string;
  kind: "text" | "textarea";
  rows?: number;
};

// 見出し付きで入力欄をまとめる単位（例: 「競合店①」）。
// title を省略すると見出しなしでフィールドだけ並ぶ。
export type FormSection = {
  id: string;
  title?: string;
  fields: QuestionField[];
};

export type WorkConfig = {
  workId: string;
  pageTitle: string;
  pageDescription: string;
  sections: FormSection[];
  buildPrompt: (answers: Record<string, string>) => string;
};

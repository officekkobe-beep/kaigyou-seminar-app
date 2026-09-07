// ブラウザ内だけで完結するOCRユーティリティ（Tesseract.js）。
// 画像・OCR結果はどこにも送信・保存しない。ページを離れる／再読込すれば消える。
//
// ワーカー（言語データ jpn+eng を読み込んだOCRエンジン）は初回利用時に
// 遅延生成し、以降の商品でも使い回す。初回だけ言語データの読み込みで
// 時間がかかるため、呼び出し側で「読み取っています…」等の表示を出すこと。

import type { Worker } from "tesseract.js";

// 巨大なスクリーンショットでも処理が重くなりすぎないよう、長辺をこのサイズまで縮小する。
// 文字が潰れない範囲として1600〜2000pxを目安にした。
const MAX_LONG_SIDE = 1800;

// OCR結果がこの文字数（空白除く）未満なら、読み取り失敗として撮り直しを促す。
const MIN_OCR_TEXT_LENGTH = 20;

let workerPromise: Promise<Worker> | null = null;

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import("tesseract.js");
      return createWorker("jpn+eng");
    })();
  }
  return workerPromise;
}

async function resizeImageForOcr(file: File): Promise<HTMLCanvasElement> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
      el.src = objectUrl;
    });

    const longSide = Math.max(img.naturalWidth, img.naturalHeight);
    const scale = longSide > MAX_LONG_SIDE ? MAX_LONG_SIDE / longSide : 1;
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("画像の処理に失敗しました");
    }
    ctx.drawImage(img, 0, 0, width, height);
    return canvas;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export type OcrResult = { ok: true; text: string } | { ok: false; reason: string };

const OCR_FAILURE_MESSAGE =
  "商品情報を十分に読み取れませんでした。価格や型式が見える画面をもう一度選んでください。";
const OCR_ERROR_MESSAGE = "読み取りできませんでした。もう一度画像を選んでください。";

export async function recognizeProductImage(file: File): Promise<OcrResult> {
  try {
    const canvas = await resizeImageForOcr(file);
    const worker = await getWorker();
    const { data } = await worker.recognize(canvas);
    const text = (data.text || "").trim();

    if (text.replace(/\s/g, "").length < MIN_OCR_TEXT_LENGTH) {
      return { ok: false, reason: OCR_FAILURE_MESSAGE };
    }

    return { ok: true, text };
  } catch {
    return { ok: false, reason: OCR_ERROR_MESSAGE };
  }
}

export async function terminateOcrWorker(): Promise<void> {
  if (!workerPromise) return;
  const pending = workerPromise;
  workerPromise = null;
  try {
    const worker = await pending;
    await worker.terminate();
  } catch {
    // 終了処理の失敗は無視してよい（ページを離れる際のベストエフォート）
  }
}

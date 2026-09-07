"use client";

import { useEffect, useRef, useState } from "react";
import { copyText } from "@/lib/clipboard";
import { recognizeProductImage, terminateOcrWorker } from "@/lib/ocr";
import {
  day2Work1Equipments,
  day2Work1Meta,
  type EquipmentId,
} from "@/content/day2Work1";
import WorkNav from "./WorkNav";
import formStyles from "./WorkForm.module.css";
import styles from "./EquipmentSelectForm.module.css";

type Status = "idle" | "submitting" | "done";
type ImageStatus = "processing" | "success" | "error";

type ImageState = {
  id: number;
  status: ImageStatus;
  text: string;
  errorMessage: string;
};

type ProductState = {
  images: ImageState[];
};

const PRODUCT_COUNT = 3;
const PRODUCT_LABELS = ["①", "②", "③"];
const MAX_IMAGES_PER_PRODUCT = 3;

function emptyProducts(): ProductState[] {
  return Array.from({ length: PRODUCT_COUNT }, () => ({ images: [] }));
}

// 連打による誤動作を防ぐための最短ボタン無効化時間（他ワークと同じ挙動）
const MIN_SUBMIT_MS = 2000;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 1商品分の複数画像のOCR結果を、AIへ渡す1つの文章にまとめる。
// 読み取りに成功した画像だけを [画像1] [画像2] … として連結する。
function combineProductText(product: ProductState): string {
  return product.images
    .filter((image) => image.status === "success")
    .map((image, index) => `[画像${index + 1}]\n${image.text}`)
    .join("\n\n");
}

function hasSuccessImage(product: ProductState): boolean {
  return product.images.some((image) => image.status === "success");
}

export default function EquipmentSelectForm() {
  const [selectedId, setSelectedId] = useState<EquipmentId | null>(null);
  const [products, setProducts] = useState<ProductState[]>(emptyProducts);
  const [status, setStatus] = useState<Status>("idle");
  const [copyOk, setCopyOk] = useState(false);
  const [promptText, setPromptText] = useState("");

  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const nextImageId = useRef(1);

  // ページを離れるときはOCRワーカーも破棄する（画像・OCR結果は保持しない）
  useEffect(() => {
    return () => {
      terminateOcrWorker();
    };
  }, []);

  const selected = day2Work1Equipments.find((e) => e.id === selectedId);
  const isSubmitting = status === "submitting";
  const allProductsReady = products.every(hasSuccessImage);

  // 新しい画像を追加・削除した時点で、それより前にコピーした文章は古くなるため無効化する
  function invalidateCopy() {
    setStatus("idle");
    setCopyOk(false);
    setPromptText("");
  }

  function handleSelect(id: EquipmentId) {
    setSelectedId(id);
    setProducts(emptyProducts());
    invalidateCopy();
    fileInputRefs.current.forEach((input) => {
      if (input) input.value = "";
    });
  }

  async function handleAddImage(productIndex: number, file: File | null) {
    if (!file) return;
    // 上限を超える追加はUI側でも塞いでいるが、念のためここでも止める
    if (products[productIndex].images.length >= MAX_IMAGES_PER_PRODUCT) return;

    const imageId = nextImageId.current++;
    invalidateCopy();

    setProducts((prev) =>
      prev.map((product, index) =>
        index === productIndex
          ? {
              images: [
                ...product.images,
                { id: imageId, status: "processing", text: "", errorMessage: "" },
              ],
            }
          : product,
      ),
    );

    // 同じ画像を選び直しても onChange が発火するよう、毎回値をクリアする
    const input = fileInputRefs.current[productIndex];
    if (input) input.value = "";

    const result = await recognizeProductImage(file);

    setProducts((prev) =>
      prev.map((product, index) => {
        if (index !== productIndex) return product;
        return {
          images: product.images.map((image) =>
            image.id === imageId
              ? result.ok
                ? { ...image, status: "success" as const, text: result.text, errorMessage: "" }
                : { ...image, status: "error" as const, text: "", errorMessage: result.reason }
              : image,
          ),
        };
      }),
    );
  }

  function handleRemoveImage(productIndex: number, imageId: number) {
    invalidateCopy();
    setProducts((prev) =>
      prev.map((product, index) =>
        index === productIndex
          ? { images: product.images.filter((image) => image.id !== imageId) }
          : product,
      ),
    );
  }

  async function handleCopy() {
    if (!selected || !allProductsReady || isSubmitting) return;

    setStatus("submitting");

    const ocrTexts = products.map(combineProductText) as [string, string, string];
    const prompt = selected.buildComparePrompt(ocrTexts);
    setPromptText(prompt);

    const [copySucceeded] = await Promise.all([
      copyText(prompt),
      wait(MIN_SUBMIT_MS),
    ]);

    setCopyOk(copySucceeded);
    setStatus("done");
  }

  return (
    <>
      <WorkNav />
      <main className={formStyles.page}>
        <h1 className={formStyles.title}>{day2Work1Meta.pageTitle}</h1>
        <p className={formStyles.description}>
          {day2Work1Meta.pageDescription}
        </p>

        <div
          className={styles.equipmentList}
          role="radiogroup"
          aria-label="担当する設備"
        >
          {day2Work1Equipments.map((equipment) => {
            const isSelected = equipment.id === selectedId;
            return (
              <button
                key={equipment.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                className={
                  isSelected
                    ? styles.equipmentCardSelected
                    : styles.equipmentCard
                }
                onClick={() => handleSelect(equipment.id)}
              >
                {equipment.label}
              </button>
            );
          })}
        </div>

        {selected && (
          <>
            <p className={styles.guideNote}>
              価格・型式・新品／中古などの商品情報が文字で見える画面を選んでください。情報が複数画面に分かれている場合は、1商品につき最大3枚まで追加できます。
            </p>

            <div className={styles.productList}>
              {products.map((product, productIndex) => {
                const inputId = `product-file-${productIndex}`;
                const isProcessing = product.images.some(
                  (image) => image.status === "processing",
                );
                const isFull = product.images.length >= MAX_IMAGES_PER_PRODUCT;

                return (
                  <div className={styles.productCard} key={productIndex}>
                    <h2 className={styles.productTitle}>
                      商品{PRODUCT_LABELS[productIndex]}
                    </h2>

                    {product.images.length > 0 && (
                      <ul className={styles.imageList}>
                        {product.images.map((image, imageIndex) => (
                          <li className={styles.imageRow} key={image.id}>
                            {image.status === "processing" && (
                              <span className={styles.imageLabelProcessing}>
                                画像{imageIndex + 1}　画像から文字を読み取っています…
                              </span>
                            )}
                            {image.status === "success" && (
                              <span className={styles.imageLabelSuccess}>
                                ✓ 画像{imageIndex + 1} 読み取り完了
                              </span>
                            )}
                            {image.status === "error" && (
                              <span className={styles.imageLabelError} role="alert">
                                画像{imageIndex + 1}　{image.errorMessage}
                              </span>
                            )}

                            {image.status !== "processing" && (
                              <button
                                type="button"
                                className={styles.removeButton}
                                onClick={() =>
                                  handleRemoveImage(productIndex, image.id)
                                }
                              >
                                削除
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}

                    <input
                      ref={(el) => {
                        fileInputRefs.current[productIndex] = el;
                      }}
                      id={inputId}
                      type="file"
                      accept="image/*"
                      className={styles.fileInput}
                      disabled={isProcessing || isFull}
                      onChange={(e) =>
                        handleAddImage(productIndex, e.target.files?.[0] ?? null)
                      }
                    />

                    {!isFull && (
                      <label
                        htmlFor={inputId}
                        className={
                          isProcessing
                            ? styles.fileButtonDisabled
                            : styles.fileButton
                        }
                      >
                        {isProcessing
                          ? "処理中…"
                          : product.images.length === 0
                            ? "画像を選ぶ"
                            : "画像を追加する"}
                      </label>
                    )}
                    {isFull && (
                      <p className={styles.imageLimitNote}>
                        画像は3枚までです。追加する場合はどれかを削除してください。
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {selected && (
          <>
            <button
              type="button"
              className={`${formStyles.mainButton} ${styles.copyButton}`}
              disabled={!allProductsReady || isSubmitting}
              onClick={handleCopy}
            >
              {isSubmitting ? "処理しています…" : "AIに貼り付ける文章をコピー"}
            </button>
            {!allProductsReady && (
              <p className={styles.copyHint}>
                商品①②③それぞれ1枚以上の読み取りが完了するとコピーできます。
              </p>
            )}
          </>
        )}

        <p className={formStyles.staffNote}>
          うまく操作できない場合はスタッフをお呼びください。
        </p>

        {status === "done" && (
          <section className={formStyles.result} aria-live="polite">
            {copyOk ? (
              <p className={formStyles.successMessage}>
                コピーできました。
                <br />
                次にChatGPTを開いて、貼り付けて送信してください。
              </p>
            ) : (
              <>
                <p className={formStyles.warnMessage}>
                  自動コピーができませんでした。
                  <br />
                  下の文章を選んでコピーしてください。
                </p>
                <textarea
                  readOnly
                  className={formStyles.manualCopyArea}
                  value={promptText}
                  onFocus={(e) => e.target.select()}
                />
              </>
            )}

            <a
              href="https://chat.openai.com/"
              target="_blank"
              rel="noopener noreferrer"
              className={formStyles.chatGptButton}
            >
              ChatGPTを開く
            </a>
            <p className={formStyles.smallNote}>
              普段使っている別のAIがある方は、そちらを使っても構いません。
            </p>
          </section>
        )}
      </main>
    </>
  );
}

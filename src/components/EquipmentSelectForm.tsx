"use client";

import { useState } from "react";
import { copyText } from "@/lib/clipboard";
import {
  day2Work1Equipments,
  day2Work1Meta,
  type EquipmentId,
} from "@/content/day2Work1";
import WorkNav from "./WorkNav";
import formStyles from "./WorkForm.module.css";
import styles from "./EquipmentSelectForm.module.css";

type Status = "idle" | "submitting" | "done";

// 連打による誤動作を防ぐための最短ボタン無効化時間（1日目ワークと同じ挙動）
const MIN_SUBMIT_MS = 2000;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function EquipmentSelectForm() {
  const [selectedId, setSelectedId] = useState<EquipmentId | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [copyOk, setCopyOk] = useState(false);
  const [promptText, setPromptText] = useState("");

  const selected = day2Work1Equipments.find((e) => e.id === selectedId);
  const isSubmitting = status === "submitting";

  function handleSelect(id: EquipmentId) {
    setSelectedId(id);
    setStatus("idle");
  }

  async function handleCopy() {
    if (!selected || isSubmitting) return;

    setStatus("submitting");

    const prompt = selected.buildPrompt();
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
          <button
            type="button"
            className={`${formStyles.mainButton} ${styles.copyButton}`}
            disabled={isSubmitting}
            onClick={handleCopy}
          >
            {isSubmitting ? "処理しています…" : "AIに貼り付ける文章をコピー"}
          </button>
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

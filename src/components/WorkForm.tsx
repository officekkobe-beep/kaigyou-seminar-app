"use client";

import { useRef, useState } from "react";
import type { WorkConfig } from "@/lib/types";
import { copyText } from "@/lib/clipboard";
import WorkNav from "./WorkNav";
import styles from "./WorkForm.module.css";

type Status = "idle" | "submitting" | "done";

// 連打による誤動作を防ぐための最短ボタン無効化時間
const MIN_SUBMIT_MS = 2000;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type WorkFormProps = {
  config: WorkConfig;
};

export default function WorkForm({ config }: WorkFormProps) {
  const allFields = config.sections.flatMap((section) => section.fields);

  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries(allFields.map((f) => [f.id, ""])),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [copyOk, setCopyOk] = useState(false);
  const [promptText, setPromptText] = useState("");

  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  function validate(): { id: string; message: string } | null {
    for (const section of config.sections) {
      for (const field of section.fields) {
        const value = answers[field.id];
        if (!value || value.trim() === "") {
          const prefix = section.title ? `${section.title}の` : "";
          return {
            id: field.id,
            message: `${prefix}「${field.label}」がまだ入力されていません。`,
          };
        }
      }
    }
    return null;
  }

  function focusField(id: string) {
    const el = fieldRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "submitting") return;

    const error = validate();
    if (error) {
      setErrors({ [error.id]: error.message });
      focusField(error.id);
      return;
    }

    setErrors({});
    setStatus("submitting");

    const prompt = config.buildPrompt(answers);
    setPromptText(prompt);

    const [copySucceeded] = await Promise.all([
      copyText(prompt),
      wait(MIN_SUBMIT_MS),
    ]);

    setCopyOk(copySucceeded);
    setStatus("done");
  }

  function handleChange(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  const isSubmitting = status === "submitting";

  return (
    <>
      <WorkNav />
      <main className={styles.page}>
        <h1 className={styles.title}>{config.pageTitle}</h1>
        <p className={styles.description}>{config.pageDescription}</p>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {config.sections.map((section) => (
            <div className={styles.section} key={section.id}>
              {section.title && (
                <h2 className={styles.sectionTitle}>{section.title}</h2>
              )}
              {section.fields.map((field) => (
                <div className={styles.fieldBlock} key={field.id}>
                  <label htmlFor={field.id} className={styles.label}>
                    {field.label}
                  </label>
                  {field.help && <p className={styles.help}>{field.help}</p>}
                  {field.kind === "textarea" ? (
                    <textarea
                      id={field.id}
                      ref={(el) => {
                        fieldRefs.current[field.id] = el;
                      }}
                      className={styles.textarea}
                      rows={field.rows ?? 4}
                      value={answers[field.id]}
                      onChange={(e) => handleChange(field.id, e.target.value)}
                      aria-invalid={Boolean(errors[field.id])}
                      aria-describedby={
                        errors[field.id] ? `${field.id}-error` : undefined
                      }
                    />
                  ) : (
                    <input
                      id={field.id}
                      ref={(el) => {
                        fieldRefs.current[field.id] = el;
                      }}
                      className={styles.input}
                      type="text"
                      value={answers[field.id]}
                      onChange={(e) => handleChange(field.id, e.target.value)}
                      aria-invalid={Boolean(errors[field.id])}
                      aria-describedby={
                        errors[field.id] ? `${field.id}-error` : undefined
                      }
                    />
                  )}
                  {errors[field.id] && (
                    <p
                      id={`${field.id}-error`}
                      className={styles.error}
                      role="alert"
                    >
                      {errors[field.id]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ))}

          <button
            type="submit"
            className={styles.mainButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? "処理しています…" : "AIに貼り付ける文章をコピー"}
          </button>

          <p className={styles.staffNote}>
            うまく操作できない場合はスタッフをお呼びください。
          </p>
        </form>

        {status === "done" && (
          <section className={styles.result} aria-live="polite">
            {copyOk ? (
              <p className={styles.successMessage}>
                コピーできました。
                <br />
                次にChatGPTを開いて、貼り付けて送信してください。
              </p>
            ) : (
              <>
                <p className={styles.warnMessage}>
                  自動コピーができませんでした。
                  <br />
                  下の文章を選んでコピーしてください。
                </p>
                <textarea
                  readOnly
                  className={styles.manualCopyArea}
                  value={promptText}
                  onFocus={(e) => e.target.select()}
                />
              </>
            )}

            <a
              href="https://chat.openai.com/"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.chatGptButton}
            >
              ChatGPTを開く
            </a>
            <p className={styles.smallNote}>
              普段使っている別のAIがある方は、そちらを使っても構いません。
            </p>
          </section>
        )}
      </main>
    </>
  );
}

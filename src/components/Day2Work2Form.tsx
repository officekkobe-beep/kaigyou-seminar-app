"use client";

import { useRef, useState } from "react";
import {
  calculateDay2Work2,
  buildDay2Work2Prompt,
  day2Work2Meta,
  type Day2Work2CalcResult,
} from "@/content/day2Work2";
import { copyText } from "@/lib/clipboard";
import WorkNav from "./WorkNav";
import styles from "./Day2Work2Form.module.css";

type SegmentInput = {
  name: string;
  occupancyRate: string;
  turnoverRate: string;
  businessDays: string;
};

type CalculatedSnapshot = {
  targetSales: number;
  seats: number;
  currentUnitPrice: number;
  segment1: { name: string; occupancyRate: number; turnoverRate: number; businessDays: number };
  segment2: { name: string; occupancyRate: number; turnoverRate: number; businessDays: number };
};

type CopyStatus = "idle" | "submitting" | "done";

const MIN_SUBMIT_MS = 2000;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function emptySegment(): SegmentInput {
  return { name: "", occupancyRate: "", turnoverRate: "", businessDays: "" };
}

function toNumber(value: string): number {
  return Number(value.replace(/,/g, "").trim());
}

function isFilled(value: string): boolean {
  return value.trim() !== "";
}

function formatYen(value: number): string {
  return `${value.toLocaleString("ja-JP")}円`;
}

function inputsKey(
  targetSales: string,
  seats: string,
  currentUnitPrice: string,
  segment1: SegmentInput,
  segment2: SegmentInput,
): string {
  return JSON.stringify({ targetSales, seats, currentUnitPrice, segment1, segment2 });
}

export default function Day2Work2Form() {
  const [targetSales, setTargetSales] = useState("");
  const [seats, setSeats] = useState("");
  const [currentUnitPrice, setCurrentUnitPrice] = useState("");
  const [segment1, setSegment1] = useState<SegmentInput>(emptySegment);
  const [segment2, setSegment2] = useState<SegmentInput>(emptySegment);
  const [strategy1, setStrategy1] = useState("");
  const [strategy2, setStrategy2] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Day2Work2CalcResult | null>(null);
  const [calculatedSnapshot, setCalculatedSnapshot] = useState<CalculatedSnapshot | null>(null);
  const [calculatedKey, setCalculatedKey] = useState<string | null>(null);

  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const [copyOk, setCopyOk] = useState(false);
  const [promptText, setPromptText] = useState("");

  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  const currentKey = inputsKey(targetSales, seats, currentUnitPrice, segment1, segment2);
  const isStale = result !== null && calculatedKey !== null && calculatedKey !== currentKey;

  function focusField(id: string) {
    const el = fieldRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus();
    }
  }

  function validate(): { id: string; message: string } | null {
    const checks: { id: string; label: string; value: string; positive?: boolean }[] = [
      { id: "targetSales", label: "目標売上", value: targetSales },
      { id: "seats", label: "席数", value: seats, positive: true },
      { id: "currentUnitPrice", label: "現在想定している客単価", value: currentUnitPrice },
      { id: "seg1-name", label: "営業区分①の区分名", value: segment1.name },
      { id: "seg1-occupancy", label: "営業区分①の満席率", value: segment1.occupancyRate, positive: true },
      { id: "seg1-turnover", label: "営業区分①の回転数", value: segment1.turnoverRate, positive: true },
      { id: "seg1-days", label: "営業区分①の営業日数", value: segment1.businessDays, positive: true },
      { id: "seg2-name", label: "営業区分②の区分名", value: segment2.name },
      { id: "seg2-occupancy", label: "営業区分②の満席率", value: segment2.occupancyRate, positive: true },
      { id: "seg2-turnover", label: "営業区分②の回転数", value: segment2.turnoverRate, positive: true },
      { id: "seg2-days", label: "営業区分②の営業日数", value: segment2.businessDays, positive: true },
    ];

    for (const check of checks) {
      if (!isFilled(check.value)) {
        return { id: check.id, message: `「${check.label}」がまだ入力されていません。` };
      }
      // 区分名はテキストなので数値チェックはしない
      if (check.id === "seg1-name" || check.id === "seg2-name") continue;

      const num = toNumber(check.value);
      if (Number.isNaN(num)) {
        return { id: check.id, message: `「${check.label}」は数値で入力してください。` };
      }
      if (check.positive && num <= 0) {
        return { id: check.id, message: `「${check.label}」は0より大きい数値で入力してください。` };
      }
    }

    return null;
  }

  function handleCalculate() {
    const error = validate();
    if (error) {
      setErrors({ [error.id]: error.message });
      focusField(error.id);
      return;
    }
    setErrors({});

    const snapshot: CalculatedSnapshot = {
      targetSales: toNumber(targetSales),
      seats: toNumber(seats),
      currentUnitPrice: toNumber(currentUnitPrice),
      segment1: {
        name: segment1.name.trim(),
        occupancyRate: toNumber(segment1.occupancyRate),
        turnoverRate: toNumber(segment1.turnoverRate),
        businessDays: toNumber(segment1.businessDays),
      },
      segment2: {
        name: segment2.name.trim(),
        occupancyRate: toNumber(segment2.occupancyRate),
        turnoverRate: toNumber(segment2.turnoverRate),
        businessDays: toNumber(segment2.businessDays),
      },
    };

    const calcResult = calculateDay2Work2(snapshot);

    setResult(calcResult);
    setCalculatedSnapshot(snapshot);
    setCalculatedKey(currentKey);
    setCopyStatus("idle");
    setCopyOk(false);
    setPromptText("");
  }

  const canCopy =
    !isStale &&
    result !== null &&
    result.requiredUnitPriceDisplay !== null &&
    result.diffDisplay !== null &&
    calculatedSnapshot !== null &&
    isFilled(strategy1) &&
    isFilled(strategy2);

  async function handleCopy() {
    if (!canCopy || !calculatedSnapshot || !result || result.requiredUnitPriceDisplay === null || result.diffDisplay === null) {
      return;
    }
    if (copyStatus === "submitting") return;

    setCopyStatus("submitting");

    const prompt = buildDay2Work2Prompt({
      targetSales: calculatedSnapshot.targetSales,
      seats: calculatedSnapshot.seats,
      currentUnitPrice: calculatedSnapshot.currentUnitPrice,
      requiredUnitPriceDisplay: result.requiredUnitPriceDisplay,
      diffDisplay: result.diffDisplay,
      segment1: calculatedSnapshot.segment1,
      segment2: calculatedSnapshot.segment2,
      strategy1,
      strategy2,
    });
    setPromptText(prompt);

    const [copySucceeded] = await Promise.all([copyText(prompt), wait(MIN_SUBMIT_MS)]);

    setCopyOk(copySucceeded);
    setCopyStatus("done");
  }

  function updateSegment(
    which: "segment1" | "segment2",
    field: keyof SegmentInput,
    value: string,
  ) {
    const setter = which === "segment1" ? setSegment1 : setSegment2;
    setter((prev) => ({ ...prev, [field]: value }));
  }

  let copyHint = "";
  if (result === null) {
    copyHint = "先に「計算する」を押してください。";
  } else if (isStale) {
    copyHint = "入力が変更されました。もう一度「計算する」を押してください。";
  } else if (result.requiredUnitPriceDisplay === null) {
    copyHint = "必要客単価を計算できませんでした。区分の入力を見直してください。";
  } else if (!isFilled(strategy1) || !isFilled(strategy2)) {
    copyHint = "戦略①・②を入力するとコピーできます。";
  }

  return (
    <>
      <WorkNav />
      <main className={styles.page}>
        <h1 className={styles.title}>{day2Work2Meta.pageTitle}</h1>
        <p className={styles.description}>{day2Work2Meta.pageDescription}</p>

        <section className={styles.form}>
          <h2 className={styles.sectionTitle}>必要客単価を計算する</h2>

          <div className={styles.fieldBlock}>
            <label htmlFor="targetSales" className={styles.label}>
              目標売上
            </label>
            <p className={styles.help}>円で入力してください。</p>
            <input
              id="targetSales"
              ref={(el) => {
                fieldRefs.current["targetSales"] = el;
              }}
              className={styles.input}
              type="text"
              inputMode="decimal"
              value={targetSales}
              onChange={(e) => setTargetSales(e.target.value)}
              aria-invalid={Boolean(errors["targetSales"])}
            />
            {errors["targetSales"] && (
              <p className={styles.error} role="alert">
                {errors["targetSales"]}
              </p>
            )}
          </div>

          <div className={styles.fieldBlock}>
            <label htmlFor="seats" className={styles.label}>
              席数
            </label>
            <p className={styles.help}>席数を入力してください。</p>
            <input
              id="seats"
              ref={(el) => {
                fieldRefs.current["seats"] = el;
              }}
              className={styles.input}
              type="text"
              inputMode="decimal"
              value={seats}
              onChange={(e) => setSeats(e.target.value)}
              aria-invalid={Boolean(errors["seats"])}
            />
            {errors["seats"] && (
              <p className={styles.error} role="alert">
                {errors["seats"]}
              </p>
            )}
          </div>

          <div className={styles.fieldBlock}>
            <label htmlFor="currentUnitPrice" className={styles.label}>
              現在想定している客単価
            </label>
            <p className={styles.help}>円で入力してください。</p>
            <input
              id="currentUnitPrice"
              ref={(el) => {
                fieldRefs.current["currentUnitPrice"] = el;
              }}
              className={styles.input}
              type="text"
              inputMode="decimal"
              value={currentUnitPrice}
              onChange={(e) => setCurrentUnitPrice(e.target.value)}
              aria-invalid={Boolean(errors["currentUnitPrice"])}
            />
            {errors["currentUnitPrice"] && (
              <p className={styles.error} role="alert">
                {errors["currentUnitPrice"]}
              </p>
            )}
          </div>

          {(
            [
              { key: "segment1" as const, segment: segment1, title: "営業区分①", prefix: "seg1" },
              { key: "segment2" as const, segment: segment2, title: "営業区分②", prefix: "seg2" },
            ]
          ).map(({ key, segment, title, prefix }) => (
            <div className={styles.segmentBlock} key={key}>
              <h3 className={styles.segmentTitle}>{title}</h3>

              <div className={styles.fieldBlock}>
                <label htmlFor={`${prefix}-name`} className={styles.label}>
                  区分名
                </label>
                <input
                  id={`${prefix}-name`}
                  ref={(el) => {
                    fieldRefs.current[`${prefix}-name`] = el;
                  }}
                  className={styles.input}
                  type="text"
                  placeholder="例：平日、週末"
                  value={segment.name}
                  onChange={(e) => updateSegment(key, "name", e.target.value)}
                  aria-invalid={Boolean(errors[`${prefix}-name`])}
                />
                {errors[`${prefix}-name`] && (
                  <p className={styles.error} role="alert">
                    {errors[`${prefix}-name`]}
                  </p>
                )}
              </div>

              <div className={styles.fieldBlock}>
                <label htmlFor={`${prefix}-occupancy`} className={styles.label}>
                  満席率
                </label>
                <p className={styles.help}>%で入力してください。</p>
                <input
                  id={`${prefix}-occupancy`}
                  ref={(el) => {
                    fieldRefs.current[`${prefix}-occupancy`] = el;
                  }}
                  className={styles.input}
                  type="text"
                  inputMode="decimal"
                  value={segment.occupancyRate}
                  onChange={(e) => updateSegment(key, "occupancyRate", e.target.value)}
                  aria-invalid={Boolean(errors[`${prefix}-occupancy`])}
                />
                {errors[`${prefix}-occupancy`] && (
                  <p className={styles.error} role="alert">
                    {errors[`${prefix}-occupancy`]}
                  </p>
                )}
              </div>

              <div className={styles.fieldBlock}>
                <label htmlFor={`${prefix}-turnover`} className={styles.label}>
                  回転数
                </label>
                <p className={styles.help}>小数で入力できます（例：1.5）。</p>
                <input
                  id={`${prefix}-turnover`}
                  ref={(el) => {
                    fieldRefs.current[`${prefix}-turnover`] = el;
                  }}
                  className={styles.input}
                  type="text"
                  inputMode="decimal"
                  value={segment.turnoverRate}
                  onChange={(e) => updateSegment(key, "turnoverRate", e.target.value)}
                  aria-invalid={Boolean(errors[`${prefix}-turnover`])}
                />
                {errors[`${prefix}-turnover`] && (
                  <p className={styles.error} role="alert">
                    {errors[`${prefix}-turnover`]}
                  </p>
                )}
              </div>

              <div className={styles.fieldBlock}>
                <label htmlFor={`${prefix}-days`} className={styles.label}>
                  営業日数
                </label>
                <p className={styles.help}>日数を入力してください。</p>
                <input
                  id={`${prefix}-days`}
                  ref={(el) => {
                    fieldRefs.current[`${prefix}-days`] = el;
                  }}
                  className={styles.input}
                  type="text"
                  inputMode="decimal"
                  value={segment.businessDays}
                  onChange={(e) => updateSegment(key, "businessDays", e.target.value)}
                  aria-invalid={Boolean(errors[`${prefix}-days`])}
                />
                {errors[`${prefix}-days`] && (
                  <p className={styles.error} role="alert">
                    {errors[`${prefix}-days`]}
                  </p>
                )}
              </div>
            </div>
          ))}

          <button type="button" className={styles.calcButton} onClick={handleCalculate}>
            計算する
          </button>

          <p className={styles.staffNote}>うまく操作できない場合はスタッフをお呼びください。</p>
        </section>

        {result && calculatedSnapshot && (
          <section className={`${styles.resultBox} ${isStale ? styles.stale : ""}`} aria-live="polite">
            {isStale && (
              <p className={styles.staleWarning}>
                入力が変更されました。下の結果はまだ変更前の入力によるものです。もう一度「計算する」を押してください。
              </p>
            )}

            <div className={styles.formulaBlock}>
              <p className={styles.formulaSegmentTitle}>【{calculatedSnapshot.segment1.name}】</p>
              <p>
                {calculatedSnapshot.seats}席 × {calculatedSnapshot.segment1.occupancyRate}% ×{" "}
                {calculatedSnapshot.segment1.turnoverRate}回転 × {calculatedSnapshot.segment1.businessDays}日
              </p>
              <p>＝ {result.segment1CustomersDisplay.toLocaleString("ja-JP")}人</p>

              <p className={styles.formulaSegmentTitle}>【{calculatedSnapshot.segment2.name}】</p>
              <p>
                {calculatedSnapshot.seats}席 × {calculatedSnapshot.segment2.occupancyRate}% ×{" "}
                {calculatedSnapshot.segment2.turnoverRate}回転 × {calculatedSnapshot.segment2.businessDays}日
              </p>
              <p>＝ {result.segment2CustomersDisplay.toLocaleString("ja-JP")}人</p>

              <p className={styles.formulaSegmentTitle}>月間総客数</p>
              <p>{result.totalCustomersDisplay.toLocaleString("ja-JP")}人</p>

              {result.requiredUnitPriceDisplay !== null ? (
                <>
                  <p className={styles.formulaSegmentTitle}>必要客単価</p>
                  <p>
                    目標売上 {formatYen(calculatedSnapshot.targetSales)} ÷ 月間総客数{" "}
                    {result.totalCustomersDisplay.toLocaleString("ja-JP")}人
                  </p>
                  <p>＝ 必要客単価 {formatYen(result.requiredUnitPriceDisplay)}</p>
                </>
              ) : (
                <p className={styles.warnMessage}>
                  月間総客数が0人以下のため、必要客単価を計算できません。区分の入力を見直してください。
                </p>
              )}
            </div>

            {result.requiredUnitPriceDisplay !== null && result.diffDisplay !== null && (
              <div className={styles.gapBox}>
                <div className={styles.gapRow}>
                  <span className={styles.gapLabel}>現在想定している客単価</span>
                  <span className={styles.gapValue}>{formatYen(calculatedSnapshot.currentUnitPrice)}</span>
                </div>
                <div className={styles.gapRow}>
                  <span className={styles.gapLabel}>必要客単価</span>
                  <span className={styles.gapValue}>{formatYen(result.requiredUnitPriceDisplay)}</span>
                </div>
                <div className={styles.gapRow}>
                  <span className={styles.gapLabel}>差額</span>
                  <span className={styles.gapValueStrong}>{formatYen(result.diffDisplay)}</span>
                </div>
                <p className={styles.gapQuestion}>この差を、あなたならどう埋めますか？</p>
              </div>
            )}
          </section>
        )}

        <section className={styles.form}>
          <h2 className={styles.sectionTitle}>戦略を考える</h2>

          <div className={styles.fieldBlock}>
            <label htmlFor="strategy1" className={styles.label}>
              チームで考えた戦略案①
            </label>
            <textarea
              id="strategy1"
              className={styles.textarea}
              rows={4}
              value={strategy1}
              onChange={(e) => setStrategy1(e.target.value)}
            />
          </div>

          <div className={styles.fieldBlock}>
            <label htmlFor="strategy2" className={styles.label}>
              チームで考えた戦略案②
            </label>
            <textarea
              id="strategy2"
              className={styles.textarea}
              rows={4}
              value={strategy2}
              onChange={(e) => setStrategy2(e.target.value)}
            />
          </div>

          <button
            type="button"
            className={styles.mainButton}
            onClick={handleCopy}
            disabled={!canCopy || copyStatus === "submitting"}
          >
            {copyStatus === "submitting" ? "処理しています…" : "AIに貼り付ける文章をコピー"}
          </button>
          {copyHint && <p className={styles.copyHint}>{copyHint}</p>}

          <p className={styles.staffNote}>うまく操作できない場合はスタッフをお呼びください。</p>
        </section>

        {copyStatus === "done" && (
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
            <p className={styles.smallNote}>普段使っている別のAIがある方は、そちらを使っても構いません。</p>
          </section>
        )}
      </main>
    </>
  );
}

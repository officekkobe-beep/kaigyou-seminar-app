"use client";

import { useState } from "react";
import Link from "next/link";
import { works } from "@/content/works";
import styles from "./page.module.css";

// トップページは「日程を選ぶ」→「その日のワークを選ぶ」の2段階。
// 各ワークページ内の2段ナビ（WorkNav）とは別物で、ここでは
// 参加者が最初に迷わないことだけを目的にしている。
const DAYS = [1, 2] as const;
const DAY_LABELS: Record<number, string> = {
  1: "1日目",
  2: "2日目",
};

export default function Home() {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  if (selectedDay === null) {
    return (
      <main className={styles.page}>
        <h1 className={styles.title}>飲食店開業セミナー ワークシート</h1>
        <p className={styles.lead}>参加する日を選んでください。</p>

        <div className={styles.dayList}>
          {DAYS.map((day) => (
            <button
              key={day}
              type="button"
              className={styles.dayCard}
              onClick={() => setSelectedDay(day)}
            >
              {DAY_LABELS[day]}
            </button>
          ))}
        </div>
      </main>
    );
  }

  const dayWorks = works.filter((work) => work.day === selectedDay);

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>{DAY_LABELS[selectedDay]}</h1>
      <p className={styles.lead}>使うワークを選んでください。</p>

      <div className={styles.cardList}>
        {dayWorks.map((work) => (
          <Link key={work.href} href={work.href} className={styles.card}>
            <span className={styles.cardTitle}>{work.navLabel}</span>
            <span className={styles.cardDescription}>{work.description}</span>
          </Link>
        ))}
      </div>

      <button
        type="button"
        className={styles.backButton}
        onClick={() => setSelectedDay(null)}
      >
        ← 日程の選択に戻る
      </button>
    </main>
  );
}

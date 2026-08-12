import Link from "next/link";
import { works } from "@/content/works";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>飲食店開業セミナー ワークシート</h1>
      <p className={styles.lead}>使うワークを選んでください。</p>
      <div className={styles.cardList}>
        {works.map((work) => (
          <Link key={work.href} href={work.href} className={styles.card}>
            <span className={styles.cardTitle}>{work.title}</span>
            <span className={styles.cardDescription}>{work.description}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}

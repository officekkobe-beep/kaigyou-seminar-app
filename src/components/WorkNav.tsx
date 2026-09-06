"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { works } from "@/content/works";
import styles from "./WorkNav.module.css";

const DAYS = [1, 2] as const;
const DAY_LABELS: Record<number, string> = {
  1: "1日目",
  2: "2日目",
};

export default function WorkNav() {
  const pathname = usePathname();

  const currentWork = works.find((work) => work.href === pathname);
  const currentDay = currentWork?.day ?? works[0].day;

  return (
    <nav className={styles.nav} aria-label="ワーク切り替え">
      <div className={styles.dayRow}>
        {DAYS.map((day) => {
          const firstWorkOfDay = works.find((work) => work.day === day);
          if (!firstWorkOfDay) return null;
          const isActive = currentDay === day;
          return (
            <Link
              key={day}
              href={firstWorkOfDay.href}
              className={isActive ? styles.dayTabActive : styles.dayTab}
              aria-current={isActive ? "page" : undefined}
            >
              {DAY_LABELS[day]}
            </Link>
          );
        })}
      </div>

      <div className={styles.workRow}>
        {works
          .filter((work) => work.day === currentDay)
          .map((work) => {
            const isActive = pathname === work.href;
            return (
              <Link
                key={work.href}
                href={work.href}
                className={isActive ? styles.workTabActive : styles.workTab}
                aria-current={isActive ? "page" : undefined}
              >
                {work.navLabel}
              </Link>
            );
          })}
      </div>
    </nav>
  );
}

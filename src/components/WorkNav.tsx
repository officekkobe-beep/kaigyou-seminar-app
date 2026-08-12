"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { works } from "@/content/works";
import styles from "./WorkNav.module.css";

export default function WorkNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="ワーク切り替え">
      {works.map((work) => {
        const isActive = pathname === work.href;
        return (
          <Link
            key={work.href}
            href={work.href}
            className={isActive ? styles.tabActive : styles.tab}
            aria-current={isActive ? "page" : undefined}
          >
            {work.navLabel}
          </Link>
        );
      })}
    </nav>
  );
}

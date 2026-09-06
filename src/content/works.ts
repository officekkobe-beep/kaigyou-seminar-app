// トップページの一覧と、ワーク間切り替えタブの両方から参照する共通リスト。
// ワークを追加する場合はここに追記する。`day` を増やせば新しい日程タブも
// 自動的に増える（WorkNav 側の日程一覧は works から動的に導出しているため）。
export const works = [
  {
    href: "/work1",
    day: 1,
    navLabel: "ワーク①",
    title: "ワーク①",
    description: "3つの「なぜ」を整理しよう",
  },
  {
    href: "/work2",
    day: 1,
    navLabel: "ワーク②",
    title: "ワーク②",
    description: "競合を調べて、戦う場所を考えよう",
  },
  {
    href: "/work3",
    day: 1,
    navLabel: "ワーク③",
    title: "ワーク③",
    description: "お店の付加価値を整理しよう",
  },
  {
    href: "/day2-work1",
    day: 2,
    navLabel: "ワーク①",
    title: "2日目 ワーク①",
    description: "厨房設備の比較",
  },
  {
    href: "/day2-work2",
    day: 2,
    navLabel: "ワーク②",
    title: "2日目 ワーク②",
    description: "収支計画の戦略チェック",
  },
];

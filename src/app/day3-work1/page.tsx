import WorkNav from "@/components/WorkNav";
import formStyles from "@/components/WorkForm.module.css";
import styles from "./page.module.css";

// 第5回 ワーク①: セミナーの総まとめとして、別アプリの「創業計画シミュレーター」を使う。
// このページは使い方の案内と、シミュレーターを新しいタブで開くボタンだけ(入力・保存はしない)。
const SIMULATOR_URL = "https://inshoku-simulator.vercel.app/";

export default function Day3Work1Page() {
  return (
    <>
      <WorkNav />
      <main className={formStyles.page}>
        <h1 className={formStyles.title}>第5回 ワーク① 創業計画の総まとめ</h1>
        <p className={formStyles.description}>
          これまでのワークで考えたお店の内容を「創業計画シミュレーター」に入力し、売上・経費・必要な資金・借入・生活費まで、計画が成り立つかを確かめます。
        </p>

        <ol className={styles.steps}>
          <li>下のボタンを押して、シミュレーターを開きます（新しいタブで開きます）。</li>
          <li>STEP 1 から順に入力します。参考値が表示される項目もあります。</li>
          <li>最後の確認画面で「この内容で結果を見る」を押します。</li>
          <li>試算結果の「営業結果」「事業の資金」「オーナー家計」を確認します。</li>
        </ol>

        <a className={`${formStyles.mainButton} ${styles.openButton}`} href={SIMULATOR_URL} target="_blank" rel="noopener noreferrer">
          創業計画シミュレーターを開く
        </a>

        <p className={styles.note}>
          入力した内容は、このスマートフォン（ブラウザ）にだけ保存されます。途中でやめても、同じ端末・同じブラウザで開けば続きから入力できます。シミュレーターは1つのタブで使ってください。
        </p>
      </main>
    </>
  );
}

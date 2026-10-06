import { animalHeadline, modeLabel, subjectLine } from "@/lib/text";
import { RARITY_LABEL, type AnimalResult, type HumanResult, type Rarity } from "@/lib/types";
import styles from "./ResultCards.module.css";

export function RarityBadge({ rarity }: { rarity: Rarity }) {
  return <span className={`${styles.badge} ${styles[rarity]}`}>{RARITY_LABEL[rarity]}</span>;
}

export function HumanCard({ result, serial }: { result: HumanResult; serial?: string }) {
  return (
    <article className={`card ${styles.human}`}>
      <header className={styles.humanHead}>
        <span>{modeLabel(result.mode)} 기록부</span>
        {serial && <span className={styles.serial}>No. {serial}</span>}
      </header>
      <p className={styles.subject}>{subjectLine(result)}</p>
      <h2 className={styles.humanTitle}>
        <em>{result.countryName}</em>
        {result.mode === "past" ? "에서 태어난 사람" : "에서 태어날 사람"}
      </h2>
      <p className={styles.sentence}>
        {result.mode === "past"
          ? `${result.placeLabel}. 언제, 어떤 모습으로 살았는지는 시나리오에서 확인하세요.`
          : `다음 생의 무대는 ${result.countryName}. 몇 년에 무엇이 되어 살아갈지는 시나리오에서 확인하세요.`}
      </p>
      <div className={styles.stamp} aria-hidden="true">
        {result.mode === "past" ? "前生" : "來生"}
      </div>
    </article>
  );
}

export function AnimalCard({ result }: { result: AnimalResult }) {
  return (
    <article className={`card ${styles.animal} ${styles[`glow_${result.rarity}`]}`}>
      <p className={styles.subject}>{subjectLine(result)}</p>
      <div className={styles.emoji} aria-hidden="true">
        {result.emoji}
      </div>
      <RarityBadge rarity={result.rarity} />
      <h2 className={styles.animalTitle}>{result.animalName}</h2>
      <p className={styles.place}>
        📍 {result.placeName} · {result.regionName}
        {result.global && <span className={styles.globalTag}>전역 공통종</span>}
      </p>
      <p className={styles.comment}>“{result.comment}”</p>
      <p className={styles.rarityComment}>{result.rarityComment}</p>
      <p className="visually-hidden">{animalHeadline(result)}</p>
    </article>
  );
}

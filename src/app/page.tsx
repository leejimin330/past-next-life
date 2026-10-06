import Link from "next/link";
import styles from "./landing.module.css";

export default function Landing() {
  return (
    <main className={styles.main}>
      <div className="container">
        <section className={styles.hero}>
          <h1>
            나는 전생에 뭐였을까?
            <br />
            <span>다음 생엔 뭐로 태어날까?</span>
          </h1>
          <p className="muted">세계지도 위에서 당신의 지난 생과 다음 생을 뽑아보세요. 로그인하면 3번 무료.</p>
        </section>

        <div className={styles.portals}>
          <Link href="/human" className={`${styles.portal} ${styles.human}`}>
            <span className={styles.icon} aria-hidden="true">
              🧭
            </span>
            <h2>사람으로 보기</h2>
            <p>인구 비율대로 뽑히는 나라, 연도와 직업까지. 한국인이 나올 확률은 고작 0.6%.</p>
            <span className={styles.cta}>사람 페이지 →</span>
          </Link>
          <Link href="/animal" className={`${styles.portal} ${styles.animal}`}>
            <span className={styles.icon} aria-hidden="true">
              🐾
            </span>
            <h2>동물로 보기</h2>
            <p>17개 권역, 170여 종. 흔함부터 전설까지, 당신의 등급은?</p>
            <span className={styles.cta}>동물 페이지 →</span>
          </Link>
        </div>
      </div>
    </main>
  );
}

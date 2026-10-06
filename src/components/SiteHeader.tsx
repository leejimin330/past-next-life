import Link from "next/link";
import { getAccountView } from "@/lib/account";
import styles from "./SiteHeader.module.css";

export async function SiteHeader() {
  const view = await getAccountView();

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.logo}>
          <span aria-hidden="true">🌏</span> 전생·환생 뽑기
        </Link>
        <nav className={styles.nav}>
          <Link href="/human">사람</Link>
          <Link href="/animal">동물</Link>
          {view ? (
            <Link href="/me" className={styles.wallet} title="내 기록">
              {view.freeLeft > 0 ? <>무료 {view.freeLeft}회</> : <>💎 {view.credits}</>}
            </Link>
          ) : (
            <Link href="/login" className={styles.login}>
              로그인
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

import Link from "next/link";

export default function ResultNotFound() {
  return (
    <main className="page-main" style={{ textAlign: "center" }}>
      <div className="container">
        <h1>결과를 찾을 수 없어요</h1>
        <p className="muted">링크가 잘못되었거나 삭제된 결과예요.</p>
        <Link href="/" className="btn">
          직접 뽑아보기
        </Link>
      </div>
    </main>
  );
}

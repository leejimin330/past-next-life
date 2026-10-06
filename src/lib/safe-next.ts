/** 로그인 후 돌아갈 경로. 외부 URL로의 오픈 리다이렉트를 막는다. */
export function safeNext(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/";
  }
  return value;
}

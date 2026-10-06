# 전생·환생 뽑기

`past-next-life-spec.md` 기획서의 V1 구현. 사람/동물 페이지에서 전생·환생을 뽑고 세계지도에 표시한다.

## 실행

```bash
npm install
npm run dev        # http://localhost:3000
```

Supabase 키가 없으면 **로컬 개발 모드**로 동작한다.

- 로그인: "개발용 계정으로 시작하기" (브라우저별 쿠키 계정)
- DB: `.data/dev-db.json`
- `/me`에서 개발용 크레딧 충전(+10) 가능

## 운영 설정 (Supabase)

1. Supabase 프로젝트 생성 → SQL Editor에서 `supabase/migrations/0001_init.sql` 실행
2. Authentication → Providers에서 Kakao, Google 활성화, Redirect URL에 `https://<도메인>/auth/callback` 추가
3. `.env.example`을 `.env.local`로 복사해 키 입력

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SECRET_KEY=...        # 서버 전용
```

기존 DB에는 `supabase/migrations/0002_scenario.sql`도 실행한다.

키를 넣으면 소셜 로그인 + Postgres로 자동 전환되고 개발용 로그인/충전은 비활성화된다.

## 구조

| 경로 | 내용 |
|---|---|
| `src/lib/draw.ts` | 추첨 엔진 (서버 전용, crypto 난수) |
| `src/lib/store/` | 저장소. `file-store`(개발) / `supabase-store`(운영). 차감+저장은 한 트랜잭션 |
| `src/app/api/draw/[page]` | `POST /api/draw/human`, `POST /api/draw/animal` |
| `src/lib/scenario/` | 시나리오 보기. `library.ts`(미리 생성한 라이브러리) → 없으면 `template.ts`(예시). **런타임 API 호출 없음** |
| `scripts/build-scenarios.mjs` | 시나리오 라이브러리 생성 (Gemini + 위키백과). 결과는 `data/scenario-lib/` |
| `src/app/api/scenario/[id]` | 시나리오 생성(뽑은 본인만, 1회 생성 후 저장) |
| `src/app/me/dex` | 동물 도감 (권역별 수집률) |
| `src/components/DrawClient.tsx` | 탭·뽑기 연출·결과 (결과는 서버에서 먼저 확정) |
| `src/app/result/[id]` | 공유 페이지 + 결과 이미지(`opengraph-image`) |
| `scripts/animals.src.tsv` | 동물 도감 원본. 수정 후 `npm run build:animals` |
| `scripts/build-data.mjs` | 인구(World Bank / UN WPP)·국가 좌표·지도 데이터 생성 |

## 시나리오 라이브러리 만들기

`.env.local`에 `GEMINI_API_KEY`를 넣고 실행한다. 이미 만든 항목은 건너뛰므로 여러 날에 나눠 돌려도 된다.

```bash
node --env-file=.env.local scripts/build-scenarios.mjs animals   # 동물 178종 × 생애 4개
node --env-file=.env.local scripts/build-scenarios.mjs humans    # 나라별 × 시대 5구간 × 생애 3개 (인구순)
```

Gemini 무료 등급은 **모델당 하루 20회**라 전체(약 400회)를 채우려면 여러 날 걸린다. 결제를 연결하면 한 번에 끝난다(총 약 $10~20 추정).

## 스펙과 다르게 정한 부분

- 사람 뽑기는 **나라만**, 동물 뽑기는 **종·서식 나라만** 정한다. 연도·직업 등 자세한 인생은 "시나리오 보기"에서 미리 만든 라이브러리로 보여준다 (스펙 3-1 세부 정보 표 대체)
- 지도는 `react-simple-maps`(React 19 미지원) 대신 스펙에 적힌 대안인 **D3 직접(d3-geo)** 사용
- 동물 이미지는 결정 전이라 이모지로 대체
- 대양 권역에서는 전역 공통종(모기 등)이 나오지 않음 (바다에 서식 국가가 없어서)
- 크레딧은 플랫폼 지갑이 생기기 전까지 `users.credits` 컬럼에 둠

-- 시나리오 보기: 처음 생성한 시나리오를 뽑기 결과에 저장한다.
alter table public.draws add column scenario jsonb;

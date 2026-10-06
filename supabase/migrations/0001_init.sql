-- 전생·환생 뽑기 스키마
-- 모든 읽기/쓰기는 서버(secret key)에서만 한다. 클라이언트 직접 접근은 RLS로 막는다.

create table public.users (
  id          uuid primary key references auth.users (id) on delete cascade,
  provider    text not null,
  free_used   integer not null default 0 check (free_used >= 0),
  -- AI 웹 모음 플랫폼의 공용 크레딧. 플랫폼 지갑이 생기면 그쪽으로 이전한다.
  credits     integer not null default 0 check (credits >= 0),
  created_at  timestamptz not null default now()
);

create table public.draws (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users (id) on delete cascade,
  page        text not null check (page in ('human', 'animal')),
  mode        text not null check (mode in ('past', 'next')),
  country     text,
  animal_id   text,
  payload     jsonb not null,
  created_at  timestamptz not null default now()
);
create index draws_user_created_idx on public.draws (user_id, created_at desc);

create table public.credit_logs (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.users (id) on delete cascade,
  delta       integer not null,
  reason      text not null,
  draw_id     uuid references public.draws (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index credit_logs_user_idx on public.credit_logs (user_id, created_at desc);

alter table public.users       enable row level security;
alter table public.draws       enable row level security;
alter table public.credit_logs enable row level security;

-- 무료/크레딧 차감 + 결과 저장을 하나의 트랜잭션으로 처리한다.
create or replace function public.commit_draw(
  p_user_id    uuid,
  p_page       text,
  p_mode       text,
  p_country    text,
  p_animal_id  text,
  p_payload    jsonb,
  p_free_limit integer,
  p_cost       integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  u        public.users%rowtype;
  v_charge text;
  v_draw   public.draws%rowtype;
begin
  select * into u from public.users where id = p_user_id for update;
  if not found then
    raise exception 'user not found';
  end if;

  if u.free_used < p_free_limit then
    v_charge := 'free';
    update public.users set free_used = free_used + 1 where id = p_user_id returning * into u;
  elsif u.credits >= p_cost then
    v_charge := 'credit';
    update public.users set credits = credits - p_cost where id = p_user_id returning * into u;
  else
    return jsonb_build_object('ok', false, 'reason', 'no_credit', 'account', to_jsonb(u));
  end if;

  insert into public.draws (user_id, page, mode, country, animal_id, payload)
  values (p_user_id, p_page, p_mode, p_country, p_animal_id, p_payload)
  returning * into v_draw;

  if v_charge = 'credit' then
    insert into public.credit_logs (user_id, delta, reason, draw_id)
    values (p_user_id, -p_cost, 'draw:' || p_page, v_draw.id);
  end if;

  return jsonb_build_object('ok', true, 'charged', v_charge, 'draw', to_jsonb(v_draw), 'account', to_jsonb(u));
end;
$$;

create or replace function public.add_credits(p_user_id uuid, p_delta integer, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  u public.users%rowtype;
begin
  update public.users set credits = greatest(0, credits + p_delta) where id = p_user_id returning * into u;
  if not found then
    raise exception 'user not found';
  end if;
  insert into public.credit_logs (user_id, delta, reason) values (p_user_id, p_delta, p_reason);
  return to_jsonb(u);
end;
$$;

revoke all on function public.commit_draw from public, anon, authenticated;
revoke all on function public.add_credits from public, anon, authenticated;
grant execute on function public.commit_draw to service_role;
grant execute on function public.add_credits to service_role;

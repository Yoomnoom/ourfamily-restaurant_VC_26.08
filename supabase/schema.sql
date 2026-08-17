-- 우리집식당 — 실서비스 전환 스키마
-- Supabase SQL Editor에서 이 파일 전체를 그대로 붙여넣고 실행하세요.
-- 순서대로 실행되도록 작성되어 있습니다(위에서 아래로).

create extension if not exists pgcrypto;

-- =========================================================
-- 1. profiles (auth.users 확장)
-- =========================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  address text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- 회원가입 시 자동으로 profiles 행 생성
create function handle_new_user() returns trigger as $$
begin
  insert into profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =========================================================
-- 2. households / household_members
-- =========================================================
create table households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_member_id uuid, -- household_members.id를 가리킴(순환 참조라 FK는 아래서 추가)
  created_at timestamptz not null default now()
);

create type member_role as enum ('owner', 'co_admin', 'member');
create type response_status as enum ('pending', 'attending', 'absent');

create table household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null, -- 무가입 참여자는 null
  name text not null,
  avatar_url text,
  color text,
  default_response response_status not null default 'attending',
  role member_role not null default 'member',
  is_active boolean not null default true,
  joined_at timestamptz not null default now()
);

alter table households
  add constraint households_owner_fk
  foreign key (owner_member_id) references household_members(id) on delete set null;

-- 한 유저가 같은 가구에 중복 멤버로 들어가지 않도록
create unique index household_members_household_user_uq
  on household_members(household_id, user_id) where user_id is not null;

-- =========================================================
-- 3. meals / meal_participants
-- =========================================================
create type meal_type as enum ('home', 'eatout', 'delivery');
create type meal_status as enum ('draft', 'collecting', 'confirmed', 'completed', 'cancelled');

create table meals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  creator_member_id uuid not null references household_members(id),
  date date not null,
  time time,
  meal_type meal_type not null default 'home',
  menus text[] not null default '{}',
  status meal_status not null default 'draft',
  created_at timestamptz not null default now()
);

create table meal_participants (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references meals(id) on delete cascade,
  member_id uuid references household_members(id) on delete cascade,
  guest_name text,
  status response_status not null default 'pending',
  arrival_time time,
  note text,
  response_token uuid not null unique default gen_random_uuid(),
  responded_by text check (responded_by in ('self', 'host')),
  updated_at timestamptz not null default now(),
  constraint member_xor_guest check (
    (member_id is not null and guest_name is null) or
    (member_id is null and guest_name is not null)
  )
);

-- 계정가입 후 무가입 참여자를 실제 계정에 연결한 이력(§7.6 A/B 병합)
create table account_merge_links (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references household_members(id) on delete cascade,
  link_type text not null check (link_type in ('kakao_auto', 'manual_confirm')),
  contact_hint text,
  merged_at timestamptz not null default now(),
  undone_at timestamptz
);

-- =========================================================
-- 4. 요일별 기본응답 / 날짜별 미리답변 / 반복일정
-- =========================================================
create table advance_answers (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  member_id uuid not null references household_members(id) on delete cascade,
  date date not null,
  status response_status not null,
  unique (member_id, date)
);

create table weekday_defaults (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  member_id uuid not null references household_members(id) on delete cascade,
  day_index smallint not null check (day_index between 0 and 6),
  status response_status not null,
  unique (member_id, day_index)
);

create table recurring_meals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  days smallint[] not null,
  time time,
  meal_type meal_type not null default 'home',
  menus text[] not null default '{}',
  participant_member_ids uuid[] not null default '{}',
  last_fired_date date,
  created_at timestamptz not null default now()
);

-- =========================================================
-- 5. 메뉴 투표 / 메뉴 요청
-- =========================================================
-- 실제 화면 흐름상 투표는 식사가 만들어지기 "전" 단계에서 시작되므로(3-2에서 시작 → 3-0에서 투표 →
-- 3-2로 돌아와 확정) meal_id가 아직 없을 수 있음. household당 활성 투표 1개로 설계.
create table menu_poll (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  options text[] not null,
  votes jsonb not null default '{}', -- { member_id: chosen_option }
  created_at timestamptz not null default now()
);

create table menu_requests (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  member_id uuid not null references household_members(id) on delete cascade,
  menu text not null,
  created_at timestamptz not null default now()
);

-- =========================================================
-- 6. 방명록 / 오늘 안 본 사람
-- =========================================================
create table guestbook_notes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  member_id uuid not null references household_members(id) on delete cascade,
  message text not null,
  day date not null,
  created_at timestamptz not null default now()
);

create table last_seen (
  household_id uuid not null references households(id) on delete cascade,
  member_id uuid not null references household_members(id) on delete cascade,
  last_seen_date date not null,
  primary key (household_id, member_id)
);

-- =========================================================
-- 7. 저장된 장소 / 손님
-- =========================================================
create table saved_places (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null
);

create table saved_guests (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  visit_count int not null default 0
);

-- =========================================================
-- 8. 알림 (+ 멤버별 읽음 처리)
-- =========================================================
create table notifications (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  recipient_member_id uuid references household_members(id) on delete cascade, -- null = 가구 전체
  type text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table notification_reads (
  notification_id uuid not null references notifications(id) on delete cascade,
  member_id uuid not null references household_members(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notification_id, member_id)
);

-- =========================================================
-- 9. 밀키트 주문 (제안 이력만 — 실제 제휴사 연동은 범위 밖)
-- =========================================================
create table milkit_orders (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  meal_id uuid references meals(id) on delete set null,
  recipe_name text not null,
  missing_ingredients text[] not null default '{}',
  status text not null default 'suggested' check (status in ('suggested', 'ordered_stub')),
  created_at timestamptz not null default now()
);

-- =========================================================
-- 10. RLS 공통 헬퍼
-- =========================================================
create function is_household_member(target_household_id uuid) returns boolean as $$
  select exists (
    select 1 from household_members
    where household_id = target_household_id
      and user_id = auth.uid()
      and is_active = true
  );
$$ language sql security definer stable;

create function my_member_id(target_household_id uuid) returns uuid as $$
  select id from household_members
  where household_id = target_household_id
    and user_id = auth.uid()
    and is_active = true
  limit 1;
$$ language sql security definer stable;

create function is_household_owner(target_household_id uuid) returns boolean as $$
  select exists (
    select 1 from household_members
    where household_id = target_household_id
      and user_id = auth.uid()
      and role in ('owner', 'co_admin')
      and is_active = true
  );
$$ language sql security definer stable;

-- =========================================================
-- 11. RLS 활성화 + 정책 (household_id 있는 테이블은 전부 동일 패턴)
-- =========================================================
alter table profiles enable row level security;
alter table households enable row level security;
alter table household_members enable row level security;
alter table meals enable row level security;
alter table meal_participants enable row level security;
alter table account_merge_links enable row level security;
alter table advance_answers enable row level security;
alter table weekday_defaults enable row level security;
alter table recurring_meals enable row level security;
alter table menu_poll enable row level security;
alter table menu_requests enable row level security;
alter table guestbook_notes enable row level security;
alter table last_seen enable row level security;
alter table saved_places enable row level security;
alter table saved_guests enable row level security;
alter table notifications enable row level security;
alter table notification_reads enable row level security;
alter table milkit_orders enable row level security;

create policy "본인 프로필만" on profiles for all
  using (id = auth.uid()) with check (id = auth.uid());

create policy "가구 멤버만 households 조회/수정" on households for all
  using (is_household_member(id)) with check (is_household_member(id));

create policy "가구 멤버만 household_members 조회" on household_members for select
  using (is_household_member(household_id));
create policy "owner/co_admin만 household_members 수정" on household_members for insert
  with check (is_household_owner(household_id));
create policy "owner/co_admin만 household_members 업데이트" on household_members for update
  using (is_household_owner(household_id) or user_id = auth.uid());
create policy "owner만 household_members 삭제" on household_members for delete
  using (is_household_owner(household_id));

create policy "가구 멤버만 meals" on meals for all
  using (is_household_member(household_id)) with check (is_household_member(household_id));

-- meal_participants: 로그인한 가구 멤버는 자기 가구 식사의 참여자 목록 전체를 볼 수 있음.
-- 익명 응답(토큰 기반)은 RLS를 열어두지 않고, 아래 12번 SECURITY DEFINER 함수로만 접근.
create policy "가구 멤버만 meal_participants" on meal_participants for all
  using (is_household_member((select household_id from meals where meals.id = meal_id)))
  with check (is_household_member((select household_id from meals where meals.id = meal_id)));

create policy "가구 멤버만 account_merge_links" on account_merge_links for all
  using (is_household_member((select household_id from household_members where household_members.id = member_id)));

create policy "가구 멤버만 advance_answers" on advance_answers for all
  using (is_household_member(household_id)) with check (is_household_member(household_id));
create policy "가구 멤버만 weekday_defaults" on weekday_defaults for all
  using (is_household_member(household_id)) with check (is_household_member(household_id));
create policy "가구 멤버만 recurring_meals" on recurring_meals for all
  using (is_household_member(household_id)) with check (is_household_member(household_id));
create policy "가구 멤버만 menu_poll" on menu_poll for all
  using (is_household_member(household_id)) with check (is_household_member(household_id));
create policy "가구 멤버만 menu_requests" on menu_requests for all
  using (is_household_member(household_id)) with check (is_household_member(household_id));
create policy "가구 멤버만 guestbook_notes" on guestbook_notes for all
  using (is_household_member(household_id)) with check (is_household_member(household_id));
create policy "가구 멤버만 last_seen" on last_seen for all
  using (is_household_member(household_id)) with check (is_household_member(household_id));
create policy "가구 멤버만 saved_places" on saved_places for all
  using (is_household_member(household_id)) with check (is_household_member(household_id));
create policy "가구 멤버만 saved_guests" on saved_guests for all
  using (is_household_member(household_id)) with check (is_household_member(household_id));
create policy "가구 멤버만 notifications" on notifications for all
  using (is_household_member(household_id)) with check (is_household_member(household_id));
create policy "가구 멤버만 notification_reads" on notification_reads for all
  using (is_household_member((select household_id from notifications where notifications.id = notification_id)));
create policy "가구 멤버만 milkit_orders" on milkit_orders for all
  using (is_household_member(household_id)) with check (is_household_member(household_id));

-- =========================================================
-- 12. 1인1링크 익명 응답용 RPC (RLS 우회 없이 토큰 검증된 행만 노출)
-- =========================================================
create function get_participant_by_token(p_token uuid)
returns table (
  participant_id uuid,
  meal_id uuid,
  member_name text,
  status response_status,
  arrival_time time,
  note text,
  meal_date date,
  meal_time time,
  menus text[],
  household_name text
) as $$
  select
    mp.id, mp.meal_id,
    coalesce(hm.name, mp.guest_name),
    mp.status, mp.arrival_time, mp.note,
    m.date, m.time, m.menus,
    h.name
  from meal_participants mp
  join meals m on m.id = mp.meal_id
  join households h on h.id = m.household_id
  left join household_members hm on hm.id = mp.member_id
  where mp.response_token = p_token;
$$ language sql security definer stable;

create function respond_via_token(
  p_token uuid,
  p_status response_status,
  p_arrival_time time default null,
  p_note text default null
) returns void as $$
  update meal_participants
  set status = p_status,
      arrival_time = p_arrival_time,
      note = p_note,
      responded_by = 'self',
      updated_at = now()
  where response_token = p_token;
$$ language sql security definer volatile;

-- 익명(anon) 롤이 위 두 RPC만 호출 가능하도록. 테이블 자체엔 anon 권한 없음(RLS로 이미 막혀 있음).
grant execute on function get_participant_by_token(uuid) to anon;
grant execute on function respond_via_token(uuid, response_status, time, text) to anon;

-- =========================================================
-- 13. Realtime 활성화 (postgres_changes 구독 대상)
-- =========================================================
alter publication supabase_realtime add table meals;
alter publication supabase_realtime add table meal_participants;
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table guestbook_notes;
alter publication supabase_realtime add table advance_answers;
alter publication supabase_realtime add table last_seen;

-- =========================================================
-- 14. Storage 버킷 (프로필 사진)
-- =========================================================
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

create policy "본인 아바타만 업로드" on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "아바타는 누구나 조회 가능" on storage.objects for select
  using (bucket_id = 'avatars');
create policy "본인 아바타만 수정/삭제" on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

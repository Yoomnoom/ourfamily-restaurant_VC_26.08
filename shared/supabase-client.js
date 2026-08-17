// 우리집식당 — Supabase 클라이언트 초기화 + 공통 세션/가구 헬퍼
// 모든 code.html은 이 파일보다 먼저 아래 CDN 스크립트를 로드해야 함:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
// <script src="../shared/supabase-client.js"></script>
// <script src="../shared/api.js"></script>

// 이미 존재하던 우리집식당 백엔드(_vc2608 접미사 테이블 세트)를 그대로 사용.
// (다른 수업 프로젝트와 같은 슈퍼베이스 프로젝트를 공유하므로 접미사로 구분되어 있음 — 2026-08-17 결정)
var SUPABASE_URL = 'https://pkucszwwnwpzvzqczmhh.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrdWNzend3bndwenZ6cWN6bWhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2NTA3NzAsImV4cCI6MjA5OTIyNjc3MH0.81Tv7-cTCr2CwUv8XYHc7FEUihtHzQYIPLSKjTzEoo0';

var sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 로그인 세션 조회 (없으면 null)
async function getSession() {
  var res = await sb.auth.getSession();
  return res.data.session;
}

// 현재 로그인한 사용자의 household_members_vc2608 행(=나의 멤버 레코드) 조회.
// 가구가 여러 개일 가능성은 이 앱 범위에서 없음(1인 1가구 전제).
async function getMyMember() {
  var session = await getSession();
  if (!session) return null;
  // households_vc2608!household_members_vc2608_household_id_fkey — last_seen_vc2608가
  // household_members_vc2608·households_vc2608 둘 다 참조하는 바람에 PostgREST가
  // 어느 관계로 조인할지 애매해했음(PGRST201) — FK 이름을 명시해 해결.
  var res = await sb
    .from('household_members_vc2608')
    .select('*, households_vc2608!household_members_vc2608_household_id_fkey(*)')
    .eq('profile_id', session.user.id)
    .maybeSingle();
  if (res.error) throw res.error;
  return res.data;
}

// 로그인 안 돼 있으면 로그인 화면으로 돌려보내는 공통 가드.
// 각 화면 init()의 맨 앞에서 호출.
async function requireSession() {
  var session = await getSession();
  if (!session) {
    window.location.href = '../2-1.로그인 화면/code.html';
    return null;
  }
  return session;
}

// 참여자 개인 링크(1인1링크) 토큰은 해시로만 저장 — 원본 토큰은 URL에만 있고 DB엔 안 남음.
async function sha256Hex(text) {
  var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
}

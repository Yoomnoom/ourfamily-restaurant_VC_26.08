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
// 1인 1가구가 제품상 전제지만, 반복 테스트 등으로 실제로는 한 계정이 가구 2개의 owner가 되는
// 경우가 생겼었음(.maybeSingle()이 행 2개를 받으면 에러를 던져 로그인 이후 전체 화면이
// "-" 플레이스홀더에서 멈추는 실제 버그로 이어짐) — 가장 최근에 합류한(=온보딩을 마지막으로
// 끝낸) 가구 하나만 골라 항상 안전하게 반환하도록 방어. 실제로 확인해보니 중간에 온보딩을
// 중단했다 다시 시작한 계정은 예전(더 오래된) 가구가 구성원 1명뿐인 미완성 상태로 남아있고,
// 나중에 만든 가구가 진짜 쓰는 곳이었음 — 최신순이 더 안전한 기본값.
async function getMyMember() {
  var session = await getSession();
  if (!session) return null;
  // households_vc2608!household_members_vc2608_household_id_fkey — last_seen_vc2608가
  // household_members_vc2608·households_vc2608 둘 다 참조하는 바람에 PostgREST가
  // 어느 관계로 조인할지 애매해했음(PGRST201) — FK 이름을 명시해 해결.
  // role='pending'(가구 참여 승인 대기 중)은 아직 진짜 구성원이 아니므로 제외 —
  // 승인 전까지는 "가구 없음"과 똑같이 취급해서 앱 전체 접근을 막음.
  var res = await sb
    .from('household_members_vc2608')
    .select('*, households_vc2608!household_members_vc2608_household_id_fkey(*)')
    .eq('profile_id', session.user.id)
    .neq('role', 'pending')
    .order('joined_at', { ascending: false })
    .limit(1);
  if (res.error) throw res.error;
  return res.data && res.data[0] ? res.data[0] : null;
}

// 로그인 안 돼 있으면 로그인 화면으로, 탈퇴 처리(유예 기간) 중이면 복구 화면으로 돌려보내는 공통 가드.
// 각 화면 init()의 맨 앞에서 호출.
async function requireSession() {
  var session = await getSession();
  if (!session) {
    window.location.href = '../2-1.로그인 화면/code.html';
    return null;
  }
  var prof = await sb.from('profiles_vc2608').select('deactivated_at').eq('id', session.user.id).maybeSingle();
  if (prof.data && prof.data.deactivated_at) {
    window.location.href = '../6-2. 계정 복구/code.html';
    return null;
  }
  return session;
}

// OAuth·비밀번호 재설정의 redirectTo용 — window.location.origin만 쓰면 GitHub Pages처럼
// 저장소 이름이 붙는 서브패스(예: https://아이디.github.io/저장소명/...)에서 그 부분이
// 빠진 채로 만들어져 링크가 깨짐. 현재 페이지 기준 상대경로로 풀면 로컬/배포 어디서든 맞음.
function absoluteUrl(relativePath) {
  return new URL(encodeURI(relativePath), window.location.href).href;
}

// 참여자 개인 링크(1인1링크) 토큰은 해시로만 저장 — 원본 토큰은 URL에만 있고 DB엔 안 남음.
async function sha256Hex(text) {
  var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
}

// 화면을 이미 열어둔 채로 와이파이가 끊기는 경우("6-1 오류·복구 상태" 화면은 완전히 새로 열
// 때만 도움이 되고, 이미 켜져 있는 화면엔 안 와닿음) — 모든 화면이 이 파일을 로드하므로
// 여기 한 곳에만 붙여서 36개 화면에 따로 손대지 않고 전역으로 적용.
(function setupOfflineBanner() {
  function ensureBanner() {
    var el = document.getElementById('globalOfflineBanner');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'globalOfflineBanner';
    el.textContent = '📶 인터넷 연결이 끊겼어요 · 연결되면 자동으로 사라져요';
    el.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:9999;background:#ba1a1a;color:#fff;text-align:center;padding:8px 12px;font-size:13px;font-family:inherit;display:none;';
    document.body.appendChild(el);
    return el;
  }
  function update() {
    ensureBanner().style.display = navigator.onLine ? 'none' : 'block';
  }
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  document.addEventListener('DOMContentLoaded', update);
})();

(function () {
  'use strict';

  var ACTIVE_KEY = 'ourhome_product_tour';
  var steps = [
    { page: '3-2.', path: '../3_핵심조율 3-2. 식사 만들기/code.html', selector: '[data-tour="schedule"]', title: '날짜와 시간을 정해요', copy: '언제 먹을 식사인지 정하세요. 시간이 아직 정해지지 않았다면 시간 미정을 선택해도 돼요.' },
    { page: '3-2.', path: '../3_핵심조율 3-2. 식사 만들기/code.html', selector: '[data-tour="menu"]', title: '메뉴를 적어요', copy: '메뉴를 직접 적거나 냉장고 재료와 카테고리 추천을 활용할 수 있어요.' },
    { page: '3-2.', path: '../3_핵심조율 3-2. 식사 만들기/code.html', selector: '[data-tour="participants"]', title: '함께 먹을 가족을 골라요', copy: '참여 여부를 물어볼 가족을 선택하고, 필요한 경우 손님도 추가하세요.' },
    { page: '3-2.', path: '../3_핵심조율 3-2. 식사 만들기/code.html', selector: '[data-tour="create-submit"]', title: '식사를 만들어요', copy: '식사 만들기를 누르면 가족별 참여 링크가 준비돼요.' },
    { page: '3-8.', path: '../3_핵심조율 3-8. 참여자 링크 공유/code.html', selector: '[data-tour="share"]', title: '참여 링크를 보내요', copy: '가족마다 준비된 링크를 복사하거나 공유하세요.' },
    { page: '3-3.', path: '../3_핵심조율 3-3. 참여자 응답/code.html', selector: '[data-tour="respond"]', title: '먹을지 답해요', copy: '먹어요 또는 안 먹어요를 누르면 준비할 인원을 정확히 알 수 있어요.' },
    { page: '3-1.', path: '../3_핵심조율 3-1. 내 식탁/code.html', selector: '[data-tour="people"]', title: '응답 인원을 확인해요', copy: '먹는 사람과 아직 확인하지 않은 사람을 한눈에 확인하세요.' },
    { page: '3-4.', path: '../3_핵심조율 3-4. 확정 전 요약/code.html', selector: '[data-tour="confirm-roster"]', title: '최종 인원을 확인해요', copy: '응답 현황을 보고 실제로 준비할 인원을 마지막으로 확인하세요.' },
    { page: '3-4.', path: '../3_핵심조율 3-4. 확정 전 요약/code.html', selector: '[data-tour="confirm-submit"]', title: '오늘의 식탁을 확정해요', copy: '확정하면 가족에게 최종 식사 내용이 공유돼요.' },
    { page: '3-5.', path: '../3_핵심조율 3-5. 오늘의 식탁 완성/code.html', selector: '[data-tour="completed"]', title: '확정된 식사를 확인해요', copy: '최종 메뉴와 참여 인원을 확인하고, 식사가 끝난 뒤 사진을 남길 수 있어요.' },
    { page: '4-1.', path: '../4_캘린더 4-1. 홈 달력뷰/code.html', selector: '[data-tour="calendar"]', title: '달력에서 식사를 살펴봐요', copy: '날짜를 누르면 그날의 식사와 응답 상태를 바로 볼 수 있어요.' },
    { page: '4-1.', path: '../4_캘린더 4-1. 홈 달력뷰/code.html', selector: '[data-tour="advance"]', title: '미리 답해둘 수 있어요', copy: '앞으로 예정된 식사에 먹을지 미리 답해두세요.' },
    { page: '5-2.', path: '../5_가구설정 5-2. 식사 기록/code.html', selector: '[data-tour="records"]', title: '지난 식사를 돌아봐요', copy: '함께 먹은 식사와 사진, 비용을 기록에서 확인하세요.' },
    { page: '5-1.', path: '../5_가구설정 5-1. 가구 설정/code.html', selector: '[data-tour="household-members"]', title: '가족을 관리해요', copy: '함께 식사를 조율할 가족을 추가하거나 정보를 관리하세요.' },
    { page: '5-1.', path: '../5_가구설정 5-1. 가구 설정/code.html', selector: '[data-tour="household-invite"]', title: '가구 참여 링크를 보내요', copy: '새 가족에게 참여 링크를 보내 같은 가구에 합류하게 할 수 있어요.' },
    { page: '5-3.', path: '../5_가구설정 5-3. 설정/code.html', selector: '[data-tour="notifications"]', title: '알림을 선택해요', copy: '필요한 식사 알림만 받을 수 있도록 설정하세요.' },
    { page: '5-4.', path: '../5_가구설정 5-4. 요일별 기본 응답/code.html', selector: '[data-tour="defaults"]', title: '요일별 응답을 미리 정해요', copy: '반복되는 생활 패턴은 기본 응답으로 저장해 매번 답하는 수고를 줄이세요.' },
    { page: '8-2.', path: '../8_로드맵확장 8-2. 식사 사진 기록/code.html', selector: '[data-tour="photo"]', title: '식사 사진을 남겨요', copy: '사진과 한 줄 메모를 더하면 가족의 식사 기록이 완성돼요.' }
  ];
  var activeIndex = -1;
  var target = null;
  var scrim = null;
  var card = null;
  var marker = null;
  var preview = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && new URLSearchParams(location.search).get('tour-preview') === '1';

  function pageMatches(step) { return decodeURI(window.location.pathname).indexOf(step.page) !== -1; }
  function save(index) { localStorage.setItem(ACTIVE_KEY, JSON.stringify({ active: true, index: index })); }
  function read() { try { return JSON.parse(localStorage.getItem(ACTIVE_KEY) || 'null'); } catch (_) { return null; } }
  function clearUi() {
    if (target) target.classList.remove('product-tour-target');
    if (scrim) scrim.remove();
    if (card) card.remove();
    if (marker) marker.remove();
    target = scrim = card = marker = null;
  }
  function finish() {
    clearUi();
    localStorage.removeItem(ACTIVE_KEY);
    document.removeEventListener('keydown', onKeydown);
  }
  function go(index) {
    if (index < 0 || index >= steps.length) return finish();
    save(index);
    if (!pageMatches(steps[index])) window.location.href = steps[index].path + (preview ? '?tour-preview=1' : '');
    else render(index);
  }
  function positionCard() {
    if (!card || !target || window.innerWidth <= 640) return;
    var rect = target.getBoundingClientRect();
    var cardRect = card.getBoundingClientRect();
    var left = Math.max(16, Math.min(window.innerWidth - cardRect.width - 16, rect.left));
    var below = rect.bottom + 18;
    var top = below + cardRect.height < window.innerHeight ? below : Math.max(16, rect.top - cardRect.height - 18);
    card.style.left = left + 'px';
    card.style.top = top + 'px';
  }
  function render(index) {
    clearUi();
    activeIndex = index;
    var step = steps[index];
    target = document.querySelector(step.selector);
    if (!target || !target.getClientRects().length || target.getBoundingClientRect().height < 24) return go(index + 1);
    target.classList.add('product-tour-target');
    marker = document.createElement('span');
    marker.className = 'product-tour-marker';
    marker.textContent = index + 1;
    marker.setAttribute('aria-hidden', 'true');
    target.appendChild(marker);
    target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    scrim = document.createElement('div');
    scrim.className = 'product-tour-scrim';
    document.body.appendChild(scrim);
    card = document.createElement('section');
    card.className = 'product-tour-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'false');
    card.setAttribute('aria-labelledby', 'productTourTitle');
    card.innerHTML = '<p class="product-tour-progress">' + (index + 1) + '/' + steps.length + '</p>' +
      '<h2 id="productTourTitle" class="product-tour-title">' + step.title + '</h2>' +
      '<p class="product-tour-copy">' + step.copy + '</p>' +
      '<div class="product-tour-actions"><button type="button" class="product-tour-button product-tour-button--quiet" data-action="skip">건너뛰기</button><button type="button" class="product-tour-button product-tour-button--quiet" data-action="end">종료</button><span class="product-tour-actions__spacer"></span>' +
      (index ? '<button type="button" class="product-tour-button product-tour-button--back" data-action="prev">이전</button>' : '') +
      '<button type="button" class="product-tour-button product-tour-button--next" data-action="next">' + (index === steps.length - 1 ? '완료' : '다음') + '</button></div>';
    document.body.appendChild(card);
    card.addEventListener('click', function (event) {
      var action = event.target.closest('[data-action]');
      if (!action) return;
      if (action.dataset.action === 'prev') go(activeIndex - 1);
      if (action.dataset.action === 'next') go(activeIndex + 1);
      if (action.dataset.action === 'skip' || action.dataset.action === 'end') finish();
    });
    requestAnimationFrame(function () { positionCard(); card.querySelector('[data-action="next"]').focus(); });
    document.addEventListener('keydown', onKeydown);
  }
  function onKeydown(event) { if (event.key === 'Escape') finish(); }
  function start(index) { go(Number(index) || 0); }
  function offer(index) {
    var layer = document.createElement('div');
    layer.className = 'product-tour-offer';
    layer.setAttribute('role', 'dialog');
    layer.setAttribute('aria-modal', 'true');
    layer.innerHTML = '<div class="product-tour-offer__card"><span class="product-tour-offer__icon" aria-hidden="true">?</span><h2>이 화면에서 사용법을 볼까요?</h2><p>실제 화면을 이동하며 필요한 버튼을 짧게 안내해드려요.</p><div><button type="button" data-offer="cancel">필요 없어요</button><button type="button" data-offer="start">안내 시작</button></div></div>';
    document.body.appendChild(layer);
    layer.querySelector('[data-offer="cancel"]').onclick = function () { layer.remove(); };
    layer.querySelector('[data-offer="start"]').onclick = function () { layer.remove(); start(index); };
    layer.querySelector('[data-offer="start"]').focus();
  }
  window.OurHomeTour = { start: start, offer: offer, finish: finish };
  window.addEventListener('resize', positionCard);
  window.addEventListener('load', function () {
    if (preview && new URLSearchParams(location.search).get('tour-start') === '1') {
      start(0);
      return;
    }
    var state = read();
    if (state && state.active) {
      var currentIndex = state.index;
      if (!steps[currentIndex] || !pageMatches(steps[currentIndex])) currentIndex = steps.findIndex(pageMatches);
      if (currentIndex >= 0) {
        save(currentIndex);
        setTimeout(function () { render(currentIndex); }, 120);
        return;
      }
    }
    if (pageMatches({ page: '3-0.' })) {
      document.querySelectorAll('section[aria-labelledby="howToTitle"] button').forEach(function (button, index) { button.onclick = function () { offer(index ? steps.findIndex(function (step) { return step.page === ['3-2.','3-8.','3-3.','3-1.','5-2.'][index]; }) : 0); }; });
    }
  });
})();

(function () {
  'use strict';

  var ACTIVE_KEY = 'ourhome_product_tour';
  var WELCOME_KEY = 'ourhome_product_tour_welcome';
  var steps = [
    { page: '3-2.', path: '../3-2. 식사 만들기/code.html', selector: '[data-tour="create"]', title: '식사 일정을 만들어요', copy: '날짜와 시간, 메뉴, 함께 먹을 가족을 정하세요. 안내 중에도 직접 입력할 수 있어요.' },
    { page: '3-8.', path: '../3-8. 참여자 링크 공유/code.html', selector: '[data-tour="share"]', title: '가족에게 참여 링크를 보내요', copy: '가족마다 준비된 링크를 복사하거나 공유하세요. 각자 받은 링크에서 바로 답할 수 있어요.' },
    { page: '3-3.', path: '../3-3. 참여자 응답/code.html', selector: '[data-tour="respond"]', title: '먹을지 간단히 답해요', copy: '먹어요 또는 안 먹어요를 고르고 응답 완료를 누르세요. 확정 전에는 다시 바꿀 수 있어요.' },
    { page: '3-1.', path: '../3-1. 내 식탁/code.html', selector: '[data-tour="people"]', title: '준비할 인원을 확인해요', copy: '응답한 가족과 아직 확인하지 않은 가족을 한눈에 보고, 필요한 만큼 준비하세요.' },
    { page: '5-2.', path: '../5-2. 식사 기록/code.html', selector: '[data-tour="records"]', title: '식사 기록을 남겨요', copy: '함께 먹은 식사를 돌아보고 사진이나 비용을 덧붙일 수 있어요.' }
  ];
  var activeIndex = -1;
  var target = null;
  var scrim = null;
  var card = null;

  function pageMatches(step) { return decodeURI(window.location.pathname).indexOf(step.page) !== -1; }
  function save(index) { localStorage.setItem(ACTIVE_KEY, JSON.stringify({ active: true, index: index })); }
  function read() { try { return JSON.parse(localStorage.getItem(ACTIVE_KEY) || 'null'); } catch (_) { return null; } }
  function clearUi() {
    if (target) target.classList.remove('product-tour-target');
    if (scrim) scrim.remove();
    if (card) card.remove();
    target = scrim = card = null;
  }
  function finish() {
    clearUi();
    localStorage.removeItem(ACTIVE_KEY);
    document.removeEventListener('keydown', onKeydown);
  }
  function go(index) {
    if (index < 0 || index >= steps.length) return finish();
    save(index);
    if (!pageMatches(steps[index])) window.location.href = steps[index].path;
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
    if (!target || !target.getClientRects().length || target.getBoundingClientRect().height < 24) target = document.querySelector('main');
    if (!target) return finish();
    target.classList.add('product-tour-target');
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
  function start(index) { localStorage.setItem(WELCOME_KEY, 'seen'); go(Number(index) || 0); }
  function showWelcome() {
    if (!pageMatches({ page: '3-0.' }) || localStorage.getItem(WELCOME_KEY) || sessionStorage.getItem(WELCOME_KEY)) return;
    var welcome = document.createElement('div');
    welcome.className = 'product-tour-welcome';
    welcome.setAttribute('role', 'dialog');
    welcome.setAttribute('aria-modal', 'true');
    welcome.setAttribute('aria-labelledby', 'tourWelcomeTitle');
    welcome.innerHTML = '<div class="product-tour-welcome__card"><div class="product-tour-welcome__icon" aria-hidden="true">🍚</div><h2 id="tourWelcomeTitle" class="product-tour-welcome__title">우리집식당, 함께 둘러볼까요?</h2><p class="product-tour-welcome__copy">식사를 만들고 가족의 답을 받는 흐름을 실제 화면에서 짧게 안내해드려요.</p><div class="product-tour-welcome__actions"><button type="button" class="product-tour-welcome__start">안내 시작하기</button><button type="button" class="product-tour-welcome__later">나중에 보기</button><button type="button" class="product-tour-welcome__never">다시 보지 않기</button></div></div>';
    document.body.appendChild(welcome);
    function dismissLater() { sessionStorage.setItem(WELCOME_KEY, 'later'); document.removeEventListener('keydown', onWelcomeKeydown); welcome.remove(); }
    function onWelcomeKeydown(event) { if (event.key === 'Escape') dismissLater(); }
    welcome.querySelector('.product-tour-welcome__start').onclick = function () { document.removeEventListener('keydown', onWelcomeKeydown); welcome.remove(); start(0); };
    welcome.querySelector('.product-tour-welcome__later').onclick = dismissLater;
    welcome.querySelector('.product-tour-welcome__never').onclick = function () { localStorage.setItem(WELCOME_KEY, 'never'); document.removeEventListener('keydown', onWelcomeKeydown); welcome.remove(); };
    document.addEventListener('keydown', onWelcomeKeydown);
    welcome.querySelector('.product-tour-welcome__start').focus();
  }
  window.OurHomeTour = { start: start, finish: finish, resetWelcome: function () { localStorage.removeItem(WELCOME_KEY); } };
  window.addEventListener('resize', positionCard);
  window.addEventListener('load', function () {
    var state = read();
    if (state && state.active) {
      var currentIndex = steps.findIndex(pageMatches);
      if (currentIndex >= 0) {
        save(currentIndex);
        setTimeout(function () { render(currentIndex); }, 120);
        return;
      }
    }
    showWelcome();
  });
})();

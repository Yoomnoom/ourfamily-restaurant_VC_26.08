---
name: Warm Table
colors:
  surface: '#fbf9f8'
  surface-container-lowest: '#ffffff'
  surface-container: '#f0eded'
  on-surface: '#1b1c1c'
  on-surface-variant: '#45474a'
  outline-variant: '#c6c6ca'
  primary: '#5d5e62'
  tertiary: '#645d55'
  on-tertiary-container: '#766f66'
  tertiary-container: '#fef4e9'
  secondary: '#5e5e5f'
  secondary-container: '#e3e2e3'
  on-secondary-container: '#646465'
typography:
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  display-serif:
    fontFamily: Noto Serif
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
---

## Screen-specific notes (4-3. 월 요약 통계)

- 참고문서 화면12: 월 달력 하단 요약 카드. 총 식사 / 직접 조리 / 주문 **횟수만** 노출(§2 대원칙 "모든 것은 통계로", §14 성공지표는 MVP 성공기준에서 제외하되 노출은 함). **금액 통계는 3차 확장**이라 이 화면엔 넣지 않음(`DECISIONS.md` 2026-08-16 결정과 동일한 이유).
- PRD 원안은 조리=초록/주문=파랑으로 구분하지만 Warm Table 팔레트엔 그 색이 없어, 기존 토큰(tertiary=조리, secondary=주문)으로 대체 — 새 색 추가 없이 표현.
- `4-1. 홈 달력뷰`에서 진입한다고 가정(달력 하단 요약 카드 확장 뷰).

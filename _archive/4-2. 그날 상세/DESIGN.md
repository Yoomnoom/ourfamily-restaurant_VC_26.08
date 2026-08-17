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
  on-primary: '#ffffff'
  secondary-container: '#e3e2e3'
  on-secondary-container: '#646465'
typography:
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
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

## Screen-specific notes (4-2. 그날 상세)

- 참고문서 화면09: 달력 칸을 누르면 그날의 식사가 카드로 다 펼쳐짐(하루 여러 식사 지원 — v0.4의 "하루 1식사" 가정 폐기, §17). 각 카드: 색점(만든 사람)·시간·종류 태그(집밥/외식/배달 — **이 화면에서만** 종류 태그를 보여줌, 달력 자체엔 미표시)+대표메뉴+부메뉴+참여 현황.
- 하단 "+ 이 날 식사 추가" → `3-2. 식사 만들기`로 이동.
- `4-1. 홈 달력뷰`에서 날짜 클릭 시 이 화면으로 이동.

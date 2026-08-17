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
typography:
  display-serif:
    fontFamily: Noto Serif
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
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

## Screen-specific notes (5-5. 더보기)

- **배경**: 사용자가 하단 탭(홈/냉장고/가구/설정 4개)이 "꼭 필요한 것과 아닌 것"으로 안 나뉘어 있다고 지적. 또한 헤더에 목록/달력 토글+알림벨+프로필 버튼이 다 모여있어 360px(Galaxy S)에서 "우리집식당" 제목이 두 줄로 줄바꿈되는 실제 버그로 이어짐.
- **결정**: 하단 탭을 **홈·냉장고**(자주 쓰는 핵심 기능)만 남기고, **가구 설정·식사 기록·앱 설정**처럼 어쩌다 한 번 쓰는 것들을 이 "더보기" 하나로 모음. 헤더의 별도 프로필 버튼도 제거(더보기로 대체) — 헤더 여백 확보.
- 콘텐츠를 새로 만들지 않고 기존 화면(`5-1`,`5-2`,`5-3`)으로 연결만 함 — 중복 방지(ponytail).

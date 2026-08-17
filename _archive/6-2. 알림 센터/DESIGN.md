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

## Screen-specific notes (6-2. 알림 센터)

- 참고문서 §9 "앱 푸시"(MoSCoW Must)가 지금까지 `5-3. 설정`의 토글 하나로만 존재하고 실제 알림 목록 화면이 없었음. 이 화면이 그 목록.
- `3-1. 홈-카드목록` 헤더에 종 아이콘을 추가해 이 화면으로 연결(이전엔 알림에 진입할 방법이 아예 없었음).
- 각 항목은 원래 알림이 유래한 화면으로 연결: 응답 변경 → `3-6`, 확정 완료 → `3-5`, 미응답 리마인드 → `3-4`.

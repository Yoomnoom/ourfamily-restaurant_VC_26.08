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
  tertiary-container: '#fef4e9'
  on-tertiary-container: '#766f66'
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

## Screen-specific notes (7-2. 재료 사진 분석)

- 원본: 사용자의 별도 프로젝트 `Yoomnoom/AI-food-recognition_VC_26.07`(Flask + OpenAI Vision API + Supabase, 실제로 동작하는 백엔드). 거기선 업로드→분석중→결과가 화면 3개였는데, 여기선 `3-3` 참여자 응답과 같은 방식(한 파일 안에서 상태만 전환)으로 통합.
- **지금은 정적 목업이라 실제 OpenAI Vision 호출은 하지 않음.** "분석 중" 로딩은 타이머로 흉내만 내고, 결과는 하드코딩된 인식 재료 목록. 실제 연동 시엔 원본 저장소의 Flask 엔드포인트를 그대로 호출하면 됨(같은 팀이 만든 백엔드이므로 재사용 가능).
- 인식된 재료를 확인 후 "냉장고에 추가"하면 `localStorage['household_fridge']`에 누적되고 `7-1`로 돌아감.

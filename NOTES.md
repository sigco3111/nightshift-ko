# NOTES — 한글화 작업 메모 (nightshift-ko)

작업 순서와 결정 사항, 남은 일, 작업 방식 메모입니다. 라이선스·원작 표기는 README의 NOTICE와 `LICENSE`, `ASSETS.md`를 보세요.

## 현재 상태

- N1: i18n 계층(`src/i18n.ts`, UI 문자열 117개, ko 기본 + en), README + NOTICE, `ui-preview.html`(WebGL 없는 UI 확인 페이지)
- N2: 3D 표지판 문구 한글화(아래), 테스트 추가, README 스크린샷·크레딧
- 실제 게임 페이지는 소프트웨어 WebGL 환경(클라우드 브라우저)에서 멈추므로 라이브로 플레이하지 않습니다. 확인은 빌드·테스트·`ui-preview.html`·2D 캔버스 렌더링으로 합니다.

## 표지판 번역 방침 (`src/world/signtext.ts`)

문구 54개(`SIGN_DICT`, ko/en 키 동일) — 가이드 표지 23, 전광판(VMS) 8줄, 갓길 표지 4, 배경 간판 16, 터널·교량 3.

| 구분 | 방침 | 예 |
| --- | --- | --- |
| 가상의 지명 (원작도 가상) | 한글 음차 | NORTHGATE → 노스게이트, Kingsford → 킹스포드, Ashcombe → 애시콤 |
| 일반명사·시설명 | 번역 | AIRPORT → 공항, CITY CENTRE → 시내 중심가, Industrial Est. → 산업단지, TUNNEL EXIT → 터널 출구 |
| 노선 번호 | 그대로 (M7, A41, A9, A520) | 코드 형태라 번역하면 어색함 |
| `EXIT 14` | `출구 14` | 한국식 표기 |
| 거리 | 마일 → 미터법 | ½ mile → 800 m, 1 mile → 1.6 km |
| `SOS`, `km`, 숫자, `4.8 m`, `6.0m`, `80`, `100`, `400 m` | 그대로 | 국제 공통 표기 |
| 전광판(VMS) | 짧은 안내문 | 폭우 주의 / 속도를 줄이세요, 전방 사고 발생 / 좌측으로 진행 … |
| 배경 간판 16개 | 업종 번역 | HOTEL → 호텔, PHARMACY → 약국, CAR WASH → 세차장, BAR → 바 … |
| 터널·교량 | 이름 음차 + 종류 번역 | MERIDIAN TUNNEL → 메리디안 터널, RIVER VALE BRIDGE → 리버 베일 대교 |

영어는 그대로 유지(`en`). `SIGN_WORDS` 같은 코드 식별자는 영어 그대로 두고 표시용 글자만 사전에서 가져옵니다.

### 폰트·글자 맞춤

- 캔버스 글꼴: 라틴 표시 글꼴을 앞에(`Arial` / `Arial Narrow`) 두고 한글은 시스템 글꼴로 넘어갑니다: `"Pretendard","Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif`. 글꼴 파일은 포함하지 않습니다.
- 글자 맞춤: `fitPx()`(`signtext.ts`)가 칸 폭에 맞게 글자 크기를 줄입니다(letterSpacing 포함 재측정, 최소 0.4~0.5배, 마지막 수단으로 `fillText`의 maxWidth). 표지판마다 사용할 수 있는 폭을 지정(화살표·거리 열을 피함). 한국어 문구는 거의 줄지 않습니다(`24시간 영업`만 82→79.6px).
- 전광판(LED 120×30)은 한글이 있으면 13px(기준선 13/28)로 래스터화해 두 줄이 30행 안에 들어갑니다.
- 헥토미터 판 숫자(0-9 . L R)는 판 폭(40px)에 맞춰 38px로 폭을 고정해, 칸 기준 계산에 영향을 받지 않게 했습니다.
- 영어는 원작과 같되, 폭이 모자라는 문구(`RIVER  VALE  BRIDGE` 등 원작에서 판 밖으로 넘치던 것)는 이제 칸에 맞춰 줄어듭니다.

### 언어 전환

- 표지판 텍스처는 처음 쓸 때 한 번 그려지고, 언어를 바꾸면(`onLangChange`) 같은 캔버스에 다시 그린 뒤 `needsUpdate`로 올립니다(레이아웃·UV 불변). 다음 게임 시작·다음 접속에서는 저장된 언어로 그려집니다.
- 이 재그리기 경로는 모의 캔버스 테스트와 실제 브라우저의 2D 캔버스에서만 확인했습니다. 3D 장면(WebGL)에서의 갱신은 확인하지 못했습니다.

## 테스트

```bash
npm ci
npm i --no-save jsdom        # tests/uidom.test.ts 용 (package.json/lock 변경 없음)
npm run build && npm test    # 현재 94개 통과 + 1개 skip(원작 probe)
node tests/check-i18n.mjs    # i18n/표지판 키 빠른 검사 (러너 없이)
```

- `tests/signs.test.ts`: 표지판 사전 ko/en 일치, 한글 글꼴 목록, 세 캔버스 그리기 코드를 모의 캔버스로 실행해 모든 문구가 칸에 들어가는지·언어 전환 시 다시 그려지는지 확인.
- 글자 폭 모형은 보수적(한글 1em, 라틴 대문자 0.7em)입니다. 실제 글꼴 확인은 클라우드 브라우저의 시스템 한글 글꼴로 2D 캔버스에 그려 눈으로 봤습니다(가이드·전광판·갓길·간판·터널/교량, ko/en).

## 남은 일 / 알려진 한계

- README의 NOTICE 안 "아직 번역되지 않은 부분"에 3D 표지판 문구가 아직 미번역으로 적혀 있습니다(NOTICE는 건드리지 않기로 해서 그대로 둠). 다음에 NOTICE를 손볼 때 이 문장을 고치세요.
- 개발용 `sandbox/*.html`, `src/sandbox/*`, `tools/`, `docs/` 문서는 영어 그대로.
- 실제 게임(WebGL) 화면 캡처 없음. GPU 환경에서 표지판이 보이는지(특히 전광판 한글 가독성) 한 번 확인하면 좋습니다.
- 한글 표시는 사용자 시스템 글꼴에 의존합니다(Pretendard / Noto Sans KR / Apple SD Gothic Neo / Malgun Gothic 중 하나가 없으면 브라우저 기본 한글 글꼴).

## 작업 방식 메모 (GitHub 웹 편집)

- 커밋 메시지 접두사: 게임: / 문서:. 커밋 대화상자는 영어 메시지·설명을 미리 채우므로(Copilot) 비운 뒤 입력하고, 설명은 비어 있는지 누르기 직전에 확인.
- 웹 업로더는 파일명을 소문자로 바꾸고 한 번에 한 폴더만 올리며 현재 열린 폴더에 넣습니다(올리기 전 대상 폴더 확인). 대소문자가 있는 기존 파일은 웹 편집기로 수정.
- 새 파일 이름은 소문자로(`signtext.ts`).
- Actions: 연속 푸시 시 앞선 실행은 concurrency 설정으로 취소됩니다(정상). 마지막 실행의 성공 여부만 보면 됩니다.

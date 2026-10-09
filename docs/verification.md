# Verification

## Scope

swarm-garden: model source and focused tests, static asset/syntax checks, browser interaction, remote workflow and public site are separate evidence levels. Existing unrelated services remain outside this change.

## Evidence

### 미션 업그레이드 — 로컬 검토용 / 2026-10-09

- Scope: 이 저장소만 수정했습니다. 커밋·푸시·배포·원격 쓰기는 하지 않았고 추가 에이전트를 만들지 않았습니다. 이전 브라우저 기록은 아래 최초 버전의 역사이며 이번 변경의 증거로 재사용하지 않습니다.
- SOURCE VERIFIED: architecture.md, README.md, .gitattributes, package.json, docs/decisions.md, 기존 docs/verification.md, dist/index.html, dist/styles.css, 모든 dist/src 소스, 기존 test/model.test.js, tools/check.mjs, tools/serve.mjs를 변경 전에 전체 읽었습니다. .github/workflows/pages.yml와 .gitignore는 최종 배포/범위 검사에서 읽었습니다. 새 missions 모델과 테스트는 변경분 검토 대상입니다.
- SOURCE PARTIAL: 저장소 전체는 파일 목록을 확인하고 위 작업 관련 파일을 선택해 읽었습니다. .git 내부 이력/객체는 전체 검토 대상이 아닙니다. 파일 목록 확인을 전체 파일 검토로 표현하지 않습니다.
- SOURCE NOT_INSPECTED (absent): api-spec.md와 requirements.md는 이 저장소에 없어 읽을 수 없었습니다. architecture.md 우선순위에 맞춰 기존 순수 모델/UI 분리와 정적 dist 구조를 보존했고 문서 충돌을 발견하지 않았습니다.
- LOCAL MODEL: npm test 25/25 통과. 기존 4개 + 신규 21개. 토러스 경계 도착·결속·노출의 직접 계산, 55px 결속 경계, 현재 집결지만 인정, 소수 개체/방향 불일치 거절, 연속 유지 초기화, 유도 소진과 무료 해제, 예산 소진 후 항해, 정확한 횡풍 전환 틱, 환경력의 실제 궤적 영향, 제한 시간/위험 실패와 종료 상태 고정, 종료 틱 우선순위, 입력 거절 시 상태 불변, 최대 280개체에서 유한 좌표/속도 상한을 검사했습니다.
- LOCAL SOLVABILITY: 각 미션에서 시드 21, 22, 35, 123, 9876을 실제 1/60 스텝으로 세 집결지까지 이동시켰습니다(총 15 성공 경로). 조작 정책은 현재 목표 중심에 유도점을 놓고, 분리 0.2 / 정렬 1.5 / 응집 2.0 / 시야 120을 사용합니다. 성공 시험은 좌표를 옮기거나 진행/시간을 조작하지 않습니다. 판정 경계 전용 시험의 수동 fixture와 구분합니다. 시드 21의 동일 직선 유도에 기본 물결/흩어짐 규칙은 세 미션 모두 실패합니다. 전체 재생은 위치·진행·예산·결과까지 동일하게 재현됩니다. 이 표본은 모든 시드나 모든 전략의 성공을 보증하지 않습니다.
- LOCAL STATIC: npm run check 통과(공개 파일 6개). 모델/UI/미션 JS 구문, HTML 로컬 자산 참조, 메타데이터, CSP(connect-src 'none'), UTF-8 BOM 검사 통과. 추가 일회성 DOM 참조 검사에서 app.js의 리터럴 ID 참조 누락 없음. 이는 DOM 실행/브라우저 증거가 아닙니다.
- LOCAL PREVIEW_HTTP: npm run dev -- 0으로 127.0.0.1에만 바인딩했습니다. http://127.0.0.1:53021/ 및 styles.css, src/app.js, src/model.js, src/missions.js, src/ui.js에서 200과 HTML/CSS/JS UTF-8 MIME 확인. 포트는 현재 미리보기 세션용이며 재시작 시 달라집니다.
- LOCAL DIFF_ENCODING: git diff --check 통과. 변경 파일 10개에 대한 엄격한 UTF-8 디코딩, BOM 없음, CRLF 검사 통과. .gitattributes에 맞춘 기계적 줄바꿈 정규화만 변경 대상 파일에 적용했습니다. 기존 관련 없는 파일과 Git 기록은 변경하지 않았습니다.
- BROWSER / RESPONSIVE / TOUCH / WebMCP: NOT_RUN. 메인 작업이 실제 브라우저 통합 QA를 맡으며 이 작업은 중복 실행하지 않습니다. 원격 CI / LIVE: NOT_RUN.

#### 메인 브라우저 QA 인계

1. 로컬 URL에서 바늘문 준비 상태와 정지된 캔버스, 60개체, 도착·결속·정렬·연속 유지·예산 표시를 확인하세요. 시작 전에 클릭/Enter를 사용해 유도점을 놓고 정지 상태에서는 예산·시간이 줄지 않는지 확인하세요.
2. 로컬 성공 참조 정책(분리 0.2, 정렬 1.5, 응집 2.0, 시야 120)과 시드 21을 사용하세요. 바늘문 유도점 순서는 (340,293) → (550,307) → (770,293)입니다. 집결이 확인된 뒤 다음 목표로 유도점을 옮기세요. 모델 성공 시간은 약 9.7 시뮬레이션 초지만 실제 UI 반응/일시정지에 따라 달라집니다. 횡풍은 (335,173) → (550,417) → (780,213), 구조는 (310,138) → (570,157) → (780,313)입니다. 캔버스 CSS 크기에 맞춰 960×600 모델 좌표를 환산해야 합니다.
3. 기본 물결 규칙으로 실패를 확인하고 종료 후 재생이 잠기는지, 같은 시드 재도전이 동일 초기 조건/예산을 복구하고 규칙을 유지하는지, 새 시드·직접 시드 입력이 모델 조건을 바꾸는지 확인하세요. 위험 노출 개체의 빨간 표시와 누적 수치도 대조하세요.
4. 방향키 조준(흰 점선)/Enter 배치(고정 유도)/Space 해제, 버튼 모으기·피하기 전환, 유도 끄기를 검사하세요. hover가 유도점을 움직이거나 예산을 활성화하지 않아야 합니다. 페이지를 숨겼다 돌아온 뒤 자동 재개하지 않는지도 확인하세요.
5. 자유 실험에서 40–280개체와 장애물 추가/12개 한도/삭제, 포인터 유도가 다시 활성화되는지 확인하세요. 미션 복귀 후 개체 수/지형 수정 잠금과 순수 미션 상태를 확인하세요.
6. 1440px 및 390×844, 320×780에서 가로 넘침, 목표 원·라벨, 캔버스 비율, 조작 버튼, 터치, 확대, 키보드 포커스, 동작 줄이기 설정을 확인하세요. 콘솔 오류/경고와 네트워크 요청을 검사하세요. WebMCP 지원 시 read_swarm_state의 미션 상태 및 configure_swarm의 미션 개체 수 변경 거절을 확인하고, 미지원 브라우저의 일반 UI도 확인하세요.

### 최초 배포 전 로컬 검증 / 2026-10-09

- LOCAL: npm test 4/4 통과. npm run check로 모델/UI 구문, 로컬 자산 참조, 메타데이터, CSP, BOM 여부 통과.
- BROWSER_LOCAL: 일시 정지·재생, 장애물 키보드 배치, 규칙과 개체 수 변경, 계산 상태 읽기.
- RESPONSIVE_LOCAL: 390×844, 320×780에서 페이지 가로 넘침 없음. 현재 검사한 브라우저에서 경고/오류 로그 없음.
- WebMCP_LOCAL: 기능 감지가 되는 브라우저에서 등록된 읽기/조작 도구의 정상 호출과 의도한 잘못된 입력 거절을 확인. 이 기능이 없는 브라우저에서는 일반 UI로 사용합니다.

### 배포 결과의 별도 기록

이 문서는 최초 배포 직전의 로컬 증거입니다. 원격 CI·공개 사이트 증거와 혼동하지 않습니다.
배포 후 커밋별 CI와 공개 URL 확인 결과는 [WEB LAB 종합 검증 기록](https://github.com/HyungminYoon1/web-lab/blob/main/docs/verification.md)에 기록합니다.
이 저장소의 이후 변경은 [Actions](https://github.com/HyungminYoon1/swarm-garden/actions)에서 해당 커밋의 결과를 별도로 확인해야 합니다.

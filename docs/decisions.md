# Decisions

## D07 — 실제 경로에서 측정한 구간 분석

- Context: 사용자가 실제 실행의 손실/위험 구간과 실패 조건을 설명하는 사후 분석을 요청했습니다. 기존 캠페인과 순수 Boids/미션 계산은 유지합니다.
- Options: 임의 점수/인과 추정; 모든 개체 좌표와 조작 녹화; 고정 틱별 집결 측정을 최대 1초 구간으로 집계.
- Decision: 각 틱의 도착·결속·정렬 부족, 위험 노출 비율의 적분, 연속 유지가 끊긴 횟수, 현재 목표 중심까지 평균 토러스 거리를 집계합니다. 집결지 전환 시 구간을 나누고 종료 틱도 포함합니다. 조건 미달 합·노출·유지 끊김 상위 구간과 실제 종료 조건을 표시합니다. 미달 시간은 서로 겹치며 원인을 단정하지 않습니다. 개체 소멸이 없으므로 손실 개체 수를 표시하지 않습니다.
- Rationale: 위험·목표 거리·미달 조건을 같은 실제 이동에서 확인하며, 전체 경로 녹화 없이 분석과 비교가 가능합니다.
- Affected: dist/src/analysis.js, dist/src/missions.js, dist/src/app.js, dist/index.html, dist/styles.css, test/analysis.test.js, architecture.md.
- Review: 최대 78구간, 표시 단위는 시뮬레이션 초/모델 px/무리·초입니다. 순수 측정 시험과 실제 이동 성공·실패 시험을 구분합니다. 브라우저 E2E는 메인 담당입니다. 모든 시드의 성공이나 인과적 최적 설정을 보증하지 않습니다.

## D08 — 제한된 기기 기록과 시작 설정 재도전

- Context: 사용자가 제한된 로컬 설정·최근 요약 저장을 명시적으로 승인했습니다. D02/D05의 저장 금지 중 이 범위만 이번 요청으로 변경합니다.
- Options: 저장 없음; 좌표/시드/조작 전체 저장 및 자동 재생; 규칙·잔상 설정, 최근 종료 결과 5개, 독립 완료 임무 3개만 기기 저장.
- Decision: `swarm-garden-record-v1`을 8,192자 상한과 엄격한 구조/수치 검증으로 관리합니다. 설정을 바꾸거나 실행을 마칠 때 저장하고, 초기 열기/힌트/예시/임무 선택에는 저장하지 않습니다. 최근 결과는 임무·성공 여부·시간·확보 수·유도 시간·위험·미달 시간·유지 끊김만 보관합니다. 시드/좌표/경로/조작/개인정보/파일/날짜는 저장하지 않습니다. 실제 성공한 서로 다른 임무만 완료에 포함합니다. 명시적 기록 지우기는 실행을 정지·초기화하고 설정·기록·완료를 삭제합니다. 저장 불가/손상은 기본값과 페이지 메모리로 대응하며 실패를 표시합니다.
- Rationale: 사용자가 설정과 최근 결과를 돌아볼 수 있고 제한된 비개인 요약만 남습니다. 저장된 활성 실행이나 자동 재생을 추가하지 않습니다.
- Affected: dist/src/storage.js, dist/src/app.js, dist/index.html, test/storage.test.js, README.md, architecture.md.
- Review: 로컬 데이터는 기기 소유자가 편집 가능하며 공인 기록/순위가 아닙니다. 직전 종료 실행의 임무·시드·실제 첫 틱 설정은 페이지 메모리로만 유지합니다. 같은 시드 재도전은 현재 규칙을 유지하고 시작 설정 재도전은 과거 시작 규칙을 복원합니다. 전체 조작 재생 기능은 아니며 중간 규칙 변경 횟수와 비교 제한을 표시합니다. 새로고침하면 비교 기준은 사라집니다.

## D09 — 최소 갤러리 완료 요약

- Context: 사용자가 15개 앱에 공통 `web-lab-progress-v1` 완료 배지 계약을 승인했습니다. 갤러리와 다른 저장소는 메인 작업의 책임입니다.
- Options: 방문 수/임의 완료 수; 개인 실행 payload 공유; 검증된 저장 경계에서 자기 앱 완료 수만 공유.
- Decision: whitelist 15 IDs, 최대 15 records, 정수 `0..total<=1000`, canonical ISO UTC timestamp, 8,192자 상한의 `{version:1,apps:{[id]:{completed,total,updatedAt}}}`만 사용합니다. 개인 기록 저장 성공 후 실제 독립 완료 ID 수를 `swarm-garden` completed, total 3으로 기록합니다. 초기 보기/예시/힌트로 완료하지 않습니다. 다른 정상 앱 항목을 유지하고 손상된 공유 값은 덮어쓰지 않습니다. clear는 자기 항목만 삭제합니다. 타임스탬프는 실제 저장 갱신 시각이지 미션 완료 날짜가 아닙니다.
- Rationale: 동일 출처 갤러리가 개인 실행 데이터 접근 없이 완료 개수만 읽습니다. 서버·계정·순위·네트워크를 추가하지 않습니다.
- Affected: dist/src/progress.js, dist/src/storage.js, test/storage.test.js, architecture.md, README.md.
- Review: 동기 read-modify-write는 다른 탭과 원자적이지 않습니다. private 저장 성공과 aggregate 갱신 실패를 구분합니다. main이 각 앱 helper/15 IDs와 실제 gallery 읽기를 검증합니다. 공유 값이 손상되었으면 타 앱 데이터 보호를 위해 자기 clear도 실패할 수 있으며 UI에 표시합니다.

## D01 — Static, independent implementation

- Context: the user approved implementing all six proposed services and adding them to WEB LAB.
- Options: merge into existing services; backend/Sites hosting; independent static Pages repositories.
- Decision: independent swarm-garden repository and public GitHub Pages, pure model separated from rendering, no dependencies or new paid services.
- Rationale: fits the current collection, keeps other releases untouched, supports local model verification.
- Affected: architecture.md, dist, test, tools and .github/workflows/pages.yml.
- Review: additions requiring server state or different hosting need a separate decision.

## D02 — Transient, bounded browser state

- Context: these experiments need configuration, not user accounts or retained visitor records.
- Options: server upload/analytics/history; transient browser memory and deliberate local output.
- Decision: no stored visitor state or uploaded data. Bound all controls and model work. Pixel imports, when applicable, never leave the browser; reject unsupported/oversized files and cap decoded work.
- Rationale: privacy and predictable resource use; no API credential or personal profile required.
- Affected: dist/src/model.js, dist/src/app.js, dist/index.html and optional WebMCP summaries.
- Review: do not add hidden persistence or make medical/real-traffic/benchmark claims from these models. Use GitHub noreply identity for commits.

## D03 — 계산과 조작의 경계

- Context: 설명만 표시하는 데 그치지 않고 조작한 조건에서 실제 결과를 계산해야 합니다.
- Options: 고정 애니메이션/결과 문구; 범위를 제한한 순수 모델과 동일 상태를 읽는 UI.
- Decision: 위치를 감싸는 경계, 이전 프레임 스냅샷의 이웃, 고정 시간 간격으로 계산합니다. 개체는 40–280, 장애물은 12개로 제한합니다. 페이지가 숨겨지면 정지하고, 다시 보일 때 자동 재생하지 않습니다.
- Rationale: 재현 가능한 검사와 읽을 수 있는 결과를 제공하고 브라우저 자원 사용을 제한합니다.
- Affected: dist/src/model.js, dist/src/app.js, dist/index.html, dist/styles.css and test/model.test.js.
- Review: 이웃 탐색은 작은 모델을 위한 직접 비교 방식입니다. 개체 상한을 늘릴 때는 공간 분할과 성능 검증이 필요합니다.

## D04 — 실측 집결 목표와 제한된 유도

- Context: 사용자 요청은 단순 조절판을 넘어 실패·성공·재도전이 있는 어려운 군집 학습 게임입니다. 기존 토러스, 스냅샷 고정 스텝, O(n²) 및 정적 배포 구조를 보존해야 합니다.
- Options: 정렬도 하나만 목표로 하는 카운터; 임의 점수/잡음; 실제 위치·방향과 연속 유지에 기반한 세 가지 경로 미션.
- Decision: 60개체, 세 집결지 순서, 반경 95px, 도착 75%·55px 동료 결속 85%·정렬 55%(바늘문)/50%(기타)를 동시에 1.5초 유지합니다. 바늘문은 65초, 다른 미션은 75초 제한입니다. 목표 조건 이탈 시 유지 초기화, 제한 도달은 같은 스텝의 집결보다 우선해 실패합니다. 완료한 집결지에는 실제 측정값과 완료 시각을 남깁니다.
- Rationale: 흩어진 개체 몇 개나 표시용 카운터로 성공할 수 없고, 이동 방향과 무리 폭을 함께 조절해야 합니다. 초기 수치는 기본 규칙으로 너무 쉽게 성공하거나 유도 소진 전 집결이 어려워 수정했습니다. 현재 수치는 대표 다섯 시드에서 실제 모델 이동으로 성공하고 기본·흩어짐 규칙은 같은 직선 유도에서 실패하는 로컬 증거를 확보했습니다.
- Affected: dist/src/missions.js, dist/src/model.js, dist/src/app.js, dist/index.html, test/missions.test.js, README.md, architecture.md.
- Review: 결속은 전체 연결 그래프 판정이 아니라 가까운 동료의 존재 비율입니다. 도착 비율과 함께 판정하지만 모든 개체가 하나의 연결 성분이라는 의미는 아닙니다. 대표 시드 성공은 모든 시드나 사람의 사용성 보장이 아니므로 메인 브라우저 QA에서 난이도와 반응 시간을 평가해야 합니다.

## D05 — 환경, 예산, 재현성과 데이터 경계

- Context: 조작을 계속 켜두는 것과 관성·규칙을 활용하는 것 사이의 선택, 환경별 경로 설계, 비교 가능한 재도전이 필요합니다.
- Options: 개체 삭제/비재현 랜덤 포식자; 저장된 진행도/백엔드; 고정 시드 초기 조건과 제한된 환경력, 일시적 예산.
- Decision: 바늘문은 네 바위의 두 통로, 횡풍은 두 바위와 8 시뮬레이션 초마다 뒤집히는 수직 흐름, 구조는 바위 하나와 두 위험권입니다. 시드에 따라 초기 위치·방향과 목표/지형의 수직 오프셋이 달라집니다. 유도는 반경 480px에서 힘 110으로 작동하고, 켜 둔 시간만 24초 예산을 씁니다. 배치·이동·해제·일시정지 중 조절은 무료입니다. 소진 시 유도 해제 후 계속 이동합니다. 위험권은 회피력과 실제 내부 개체 비율의 시간 적분을 적용하며 구조 미션에서 0.65 무리·초가 실패 한도입니다. 개체를 제거하지 않습니다.
- Rationale: 결과는 모델의 경로와 조작에서 발생해야 하고, 예산 소비와 위험 노출을 같은 고정 틱으로 재현할 수 있어야 합니다. 무료 일시정지 조절은 반응 속도보다 실험·학습을 우선합니다. 자유 실험의 기존 반경 260px/힘 80과 범위는 유지합니다.
- Affected: dist/src/model.js, dist/src/missions.js, dist/src/app.js, test/missions.test.js, dist/index.html, README.md.
- Review: 힘 합산 후 기존 가속도 160 및 속도 35–110px/s 제한을 적용합니다. 흐름 크기는 45 이하, 위험권은 최대 3개/반경 150 이하로 검증합니다. 단순 위험권은 실제 동물 행동을 예측하지 않습니다. 시드 재도전 시 사용자의 규칙은 유지하고 초기 모델·예산·노출·진행만 재설정합니다. 진행/기록/시드는 페이지 메모리뿐이며 저장·전송·분석 기능을 추가하지 않습니다.

## D06 — 조작·표시와 로컬 검토 경계

- Context: 메인 작업이 실제 브라우저 통합 QA를 맡고, 이번 승인은 로컬 구현·시험·미리보기만 허용합니다. 움직임을 즉시 시작하거나 미션 조건을 변경하는 UI는 검토와 접근성을 해칩니다.
- Options: 자동 재생/마우스 hover로 예산 소비; 직접 시작과 명시적인 고정 유도점; 브라우저 QA를 중복 실행하거나 원격 배포.
- Decision: 준비/정지로 열고 직접 시작합니다. 미션은 0.6배속 표시이지만 모델은 1/60 고정 스텝입니다. 클릭/Enter 배치, 방향키 조준, Space/버튼 해제를 제공하고, 목표·결속·정렬·유지·예산·누적 위험을 실제 모델에서 표시합니다. 현재/대기/완료 목표와 위험 개체에 다른 시각 표시를 사용합니다. 미션에서 개체 수/지형 수정은 잠그고 자유 실험에서 허용합니다. 숨긴 페이지는 정지하며 자동 재개하지 않습니다. Canvas 종횡비는 모델의 8:5로 맞춥니다.
- Rationale: 의도한 조작만 예산을 쓰고, 목표 난이도를 임의 변경하지 않으며, 좌표와 표시 원의 형태가 일치합니다. 종료 후 동일 시드/새 시드로 재도전할 수 있습니다. 선택적 WebMCP 읽기는 동일 미션 상태를 반환하고 기존 개체 수 조작도 같은 잠금을 적용합니다.
- Affected: dist/src/app.js, dist/index.html, dist/styles.css, README.md, docs/verification.md.
- Review: 커밋·푸시·배포·원격 쓰기 없이 작업합니다. 브라우저·터치·반응형·시각·WebMCP 검증은 메인 작업에 인계하고 NOT_RUN으로 구분합니다. Node 테스트와 HTTP 응답은 브라우저 검증을 대체하지 않습니다. 자동화 구현 세션의 별도 승인은 추정하지 않았습니다.

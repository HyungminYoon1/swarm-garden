# SWARM GARDEN — 군집 정원

[실행](https://hyungminyoon1.github.io/swarm-garden/) · [WEB LAB](https://hyungminyoon1.github.io/web-lab/)

가까운 이웃만 살펴보는 작은 규칙으로 군집이 생기는 과정을 직접 조절하는 Boids 실험입니다.

## 직접 해보기

- 분리·정렬·응집 규칙과 시야 범위 조절
- 개체 수 변경, 재현 가능한 시드, 움직임/잔상 관찰
- 커서 모으기·밀어내기, 최대 12개 장애물 배치
- 계산된 방향 정렬도와 평균 속도 표시

개인 소개나 계정 없이 사용할 수 있습니다. 새로고침하면 실험 상태가 초기화됩니다.

참고 개념: [원문과 추가 학습](https://www.red3d.com/cwr/boids/). 구현은 이 저장소의 계산 모델과 UI로 작성했습니다.

## 실행 및 검증

Node.js 22 이상. 외부 패키지는 없습니다.

```sh
npm run dev -- 0
npm test
npm run check
```

main에 푸시하면 검증 후 dist만 GitHub Pages에 배포합니다. 계산 모델과 UI는 분리되어 있습니다. 현재 페이지를 닫으면 실험 상태가 사라지며 서버 업로드·계정·방문자 추적 기능은 없습니다. 호스팅 로그와 앱의 데이터 처리는 별개입니다.

[구조](architecture.md) · [결정 기록](docs/decisions.md) · [검증 기록](docs/verification.md)

AI 에이전트와 함께 제작했습니다. 참고 개념과 원작 링크는 앱 및 설명에 표시하며, 다른 사이트의 코드나 디자인을 복제하지 않습니다. 별도 라이선스는 아직 부여하지 않았습니다.

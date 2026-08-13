# 게임 YouTube 데이터 보드

자동차를 운전해 명조, 이환, 젠레스 존 제로 구역을 방문하고, 각 게임의 한국어 YouTube 일반 영상과 쇼츠 공개 지표를 탐색하는 정적 데이터 사이트입니다.

- `/` — 세 게임 구역을 돌아다니는 3D 드라이빙 로비
- `https://krksw96.github.io/wuthering-waves-vod-dashboard/dashboard.html?game=wuthering-waves` — 명조 데이터 보드
- `/dashboard.html?game=neverness-to-everness` — 이환 데이터 보드
- `/dashboard.html?game=zenless-zone-zero` — 젠레스 존 제로 데이터 보드

- 게임별 데이터 보드 전환
- 영상 및 크리에이터 검색
- 날짜와 콘텐츠 주제 필터
- 조회수, 좋아요, 댓글, 최신순 정렬
- 모바일 카드 레이아웃
- 필터 결과 CSV 다운로드

## 데이터 갱신

각 게임 데이터는 서로 덮어쓰지 않도록 독립 파일로 관리합니다.

- `data/wuthering-waves.js`
- `data/neverness-to-everness.js`
- `data/zenless-zone-zero.js`

명조 수집 결과를 갱신한 후 아래 명령을 실행합니다.

```powershell
npm.cmd run sync
```

이환 데이터는 인증된 Feishu 원본 시트에서 다시 생성합니다.

```powershell
npm.cmd run sync-neverness
```

광고 과업 태그는 Feishu `0GfgFb` 탭의 링크(G열, 영상 ID 보조)를 기준으로 모든 데이터 갱신 전에 자동 동기화됩니다.
인증된 KOL 데이터 작업이 공개한 광고 ID 목록을 기본으로 읽으며, `FEISHU_APP_ID`, `FEISHU_APP_SECRET`이 있으면 시트를 직접 읽습니다.

```powershell
npm.cmd run sync-ad-tags
```

## 로컬 실행

```powershell
npm.cmd run serve
```

기본 주소는 `http://127.0.0.1:8091`입니다.

3D 로비에 필요한 Three.js 모듈은 사이트에 함께 포함됩니다. WebGL을 사용할 수 없는 환경에서는 게임별 데이터 보드 바로가기가 표시됩니다.

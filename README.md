# 명조 VOD 데이터 보드

한국어로 게시된 명조 일반 영상과 쇼츠의 공개 지표를 탐색하는 정적 대시보드입니다.

- 영상 및 크리에이터 검색
- 날짜와 콘텐츠 주제 필터
- 조회수, 좋아요, 댓글, 최신순 정렬
- 모바일 카드 레이아웃
- 필터 결과 CSV 다운로드

## 데이터 갱신

상위 폴더의 수집 결과를 갱신한 후 아래 명령을 실행합니다.

```powershell
npm.cmd run sync
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

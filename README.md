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

광고 과업 태그는 Feishu `0GfgFb` 탭의 영상 ID(B열) 또는 링크(G열)를 기준으로 매일 자동 동기화됩니다.
수동 실행 시 `FEISHU_APP_ID`, `FEISHU_APP_SECRET`을 설정한 뒤 아래 명령을 사용합니다.

```powershell
npm.cmd run sync-ad-tags
```

## 로컬 실행

```powershell
npm.cmd run serve
```

기본 주소는 `http://127.0.0.1:8091`입니다.

# Lark 원본 연결과 자동 갱신 운영

현재 원본은 [명조 KOC DB](https://ojpvaupdkdbj.jp.larksuite.com/wiki/TjncwLOoOi0Ds2kBpiKjKetSpH4?sheet=4z1yjS)의 메인 DB입니다. 확인한 전자표 토큰은 `VyFzsEFMrhrTGjt4Intjxjr3pNh`, 탭은 `4z1yjS`, 헤더는 5행입니다.

## 실제 원본 열

| 분석 필드 | 원본 열 | 처리 |
| --- | --- | --- |
| 버전 | B | 원본 값 사용, 출시일 추정 안 함 |
| KOC | C | 원본 크리에이터 명칭 |
| 형식 | D | 숏폼/短视频 → Shorts, 롱폼/长视频 → VOD |
| 업로드일 | E | 한국 시간 날짜 |
| 제목 / 링크 | F / G | 영상 ID로 중복 확인 |
| 좋아요 / 조회수 | H / I | 최신 수치, 정산용 U/V는 제외 |
| 주제 | O | 한·중 병기 중 한국어 표시, 여러 태그 유지 |
| 원본 지표 갱신 시각 | C2 / Y | 사이트가 읽은 시각과 별도로 보존 |

`config/source.json`의 명시적인 열 매핑을 사용합니다. 원본 열이 이동하면 이 매핑부터 갱신해야 합니다. 공개 결과에는 영상 분석용 필드만 내보내며 원본 전체 행이나 기타 관리 열을 게시하지 않습니다.

## 현재 인증과 수집 방식

`scripts/sync-lark-cli.mjs`는 같은 Windows 사용자가 승인한 Lark CLI의 `--as user` 인증을 사용합니다. 토큰·쿠키·앱 비밀을 추출하지 않습니다. API는 읽기만 수행합니다.

1. workbook-info로 원본 토큰·탭·그리드 크기·revision을 확인합니다.
2. 전체 27개 열을 500행씩 CSV로 읽습니다. CSV 셀 안의 줄바꿈과 실제 row_indices를 보존합니다.
3. 각 배치의 행 수·열 수·행 번호·has_more를 검증하고, 모든 배치와 마지막 조회의 revision이 같아야 반영합니다.
4. 명시적 열 매핑으로 정규화하고 데이터가 비거나 과도하게 줄면 기존 파일을 유지합니다.
5. 모든 처리가 끝난 경우에만 data/koc-data.json을 원자적으로 교체합니다.

현재 CLI의 table-get은 range가 전체로 표시되어도 실제 반환 행이 부족한 현상이 확인되어 수집에 사용하지 않습니다.

## Windows 예약 실행

`scripts/register-local-sync.ps1 -Install`이 `WutheringWaves-KOC-Lark-Sync` 작업을 등록합니다. 같은 사용자의 Interactive/Limited 권한으로 숨김 실행합니다. 6시간 주기와 로그인 트리거, 중복 실행 방지, 누락 실행 보충, 15분 제한을 사용하며 비밀번호를 저장하지 않습니다.

```powershell
Get-ScheduledTask -TaskName WutheringWaves-KOC-Lark-Sync
Get-ScheduledTaskInfo -TaskName WutheringWaves-KOC-Lark-Sync
Start-ScheduledTask -TaskName WutheringWaves-KOC-Lark-Sync
```

게시 스크립트는 깨끗한 main 브랜치에서만 실행합니다. 원본 읽기와 테스트가 성공하면 koc/data/koc-data.json 하나만 커밋·push합니다. 사용자 코드나 미게시 사용자 커밋이 있으면 건드리지 않고 중단합니다. 실패 상태와 마지막 성공 커밋은 무시된 tmp 폴더에 기록합니다.

PC가 꺼져 있거나 사용자 로그아웃·네트워크 단절·인증 만료가 있으면 갱신되지 않습니다. 공개 사이트는 마지막 정상 데이터를 계속 표시합니다. 이 조건은 사이트 상단에도 표시합니다.

## 인증 만료 시

Lark의 sheets:spreadsheet:read와 wiki:wiki:readonly 읽기 권한으로 사용자가 재인증한 뒤 CLI가 인증을 완료해야 합니다. 비밀값을 채팅이나 코드에 입력하지 마세요. 재인증 후 수동 예약 작업을 실행하고 tmp/sync-status.json과 Pages 배포 상태를 확인합니다.

GitHub 인증은 현재 사용자의 Git credential manager를 사용합니다. 사용자 상호작용이 필요한 상태에서는 예약 작업이 멈추므로 일반 터미널에서 GitHub 로그인을 복구한 뒤 다시 실행합니다.

## PC 없이 동작하는 클라우드로 전환할 경우

별도로 원본을 읽을 수 있는 Lark 앱이 필요합니다. 해당 앱에 원본 시트 읽기 권한을 부여한 뒤 GitHub Secrets의 LARK_APP_ID/LARK_APP_SECRET에 저장하고, 확인한 API 주소를 config/source.json에 지정합니다. `npm run sync:api -- --dry-run`으로 검증한 후 저장소 변수 KOC_LARK_SYNC_ENABLED=true로 클라우드 워크플로를 활성화할 수 있습니다.

현재 클라우드 워크플로는 비활성 상태입니다. 전환할 때 로컬 예약 작업을 중지해 두 수집기가 동시에 같은 데이터를 게시하지 않도록 합니다. 원본 지표 자체의 YouTube 수집은 이 사이트가 수행하지 않습니다. 원본 시트의 새 값과 새 행을 사이트에 반영하는 작업입니다.
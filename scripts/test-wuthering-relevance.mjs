import test from "node:test";
import assert from "node:assert/strict";
import { classifyWutheringVideo } from "./wuthering-waves-relevance.mjs";

const channelId = "UCMPedRfD9EnS1EzAQl0nf4Q";
const classify = (title, description = "", options = {}) => classifyWutheringVideo({ title, description, channelTitle: "앙리형", channelId }, options);

test("all five reported September uploads qualify through their public metadata", () => {
  for (const title of [
    "여우의 별자리 공식 유출 보면서 심박수 측정하기",
    "명조 콘서트 끝나고 진짜가 시작됐습니다ㅋㅋ 현장 비하인드",
    "이제 숨기지 않겠습니다",
    "그는 띵붕이인가? 기자인가? 게임톡 서동규 기자님 초대석",
    "매번 싫다고 하지만 몸은 솔직한 나",
  ]) assert.equal(classify(title, "#명조").accepted, true, title);
});

test("related terms support spacing and decomposed Hangul", () => {
  for (const title of ["여우의별자리", "여우의  별자리", "쇄명 공략", "여우의 별자리".normalize("NFD")]) assert.equal(classify(title).accepted, true, title);
  assert.equal(classify("경연 공략").accepted, false);
  assert.equal(classify("경연 공략", "", { knownChannel: true }).accepted, true);
  assert.equal(classify("경연 에코 세팅", "", { knownChannel: true }).accepted, true);
  assert.equal(classify("경연 공략", "#명조").accepted, true);
});

test("catch-all tags and promotional metadata do not qualify unrelated uploads", () => {
  assert.equal(classifyWutheringVideo({ title: "이제 공개합니다", tags: ["명조"], channelTitle: "한국채널" }).accepted, false);
  assert.equal(classify("게임채널인데 고추장 버터 짜파게티", "#요리\n명조 다운로드 https://example.com").accepted, false);
  assert.equal(classify("카배 하이라이트", "#배틀그라운드 #명조 #마비노기영웅전").accepted, false);
  assert.equal(classify("이환 스토리", "#니케 #엔드필드 #명조").accepted, false);
  assert.equal(classify("헤븐번즈레드 스토리", "#명조 #그랑블루").accepted, false);
  assert.equal(classify("겜망추왕 대회", "브금: 명조 알레프원 테마곡").accepted, false);
  assert.equal(classify("뱅가드 업뎃", "명조 방송을 할때는 스포는 금지~!\n로블록스 방송은 시참입니다").accepted, false);
  assert.equal(classifyWutheringVideo({ title: "일파 혼잡 혼탁", channelTitle: "명리시향", description: "식상혼잡된 명조가 관살 직장운" }).reason, "non-game-meaning-of-myeongjo");
  assert.equal(classifyWutheringVideo({ title: "먹방", channelTitle: "명조 유튜버" }).accepted, false);
  assert.equal(classifyWutheringVideo({ title: "Wuthering Waves Story", channelTitle: "Player", defaultAudioLanguage: "ko" }).accepted, true);
});

test("donation and tool boilerplate are not AI-content disclosures", () => {
  assert.equal(classify("이제 숨기지 않겠습니다", "#명조\n후원 TTS 설정 안내\nAI 관련 문의: 메일로").accepted, true);
  for (const description of ["#명조\nAI로 만든 영상입니다", "#명조\nSuno로 제작한 음악입니다", "#명조\nAI generated music", "#명조\nAI : 목소리 Jolly Rascal", "NAI를 사용해서 제작했습니다.\n#ai만화 #명조", "#명조\n영상 속 음악은 Ai를 이용하여 곡의 주제, 가사와 보컬, 악기 등을 직접 기획하여 제작한 음악입니다."]) assert.equal(classify("명조 팬 영상", description).reason, "disclosed-ai-use", description);
  assert.equal(classify("명조 플레이", "AI 학습 금지").accepted, true);
  assert.equal(classify("명조 AI 커버").reason, "disclosed-ai-use");
  assert.equal(classify("명조 팬 영상", "#명조 #ai #fanart").reason, "disclosed-ai-use");
});

test("known title collisions and other-game titles do not qualify via boilerplate", () => {
  for (const title of ["원신 린네아 공략", "앙코르 공연", "치사량 테스트", "원신 방랑자 공략", "Roblox Cartethyia", "젠레스 신규 픽업"]) assert.equal(classify(title, "#명조 채널입니다", { knownChannel: true }).accepted, false, title);
  assert.equal(classify("명조와 원신을 비교합니다").accepted, true);
  assert.equal(classify("원신 7.1 공식방송 & 블리즈컨 같이보기", "00:00 방송시작\n35:17 명조 경연 캐릭터 트레일러\n1:54:29 원신 7.1 공식방송").accepted, true);
  assert.equal(classifyWutheringVideo({ title: "명조 신규 영상", channelId: "UCKuq0c-RXYaulECSuu5hFug" }).reason, "official-channel");
});

test("character names do not match substrings of unrelated words or names", () => {
  for (const title of ["루미네 영상", "쿠루미 뽑기", "테루미 플레이", "요루시카 노래", "루시우 장인", "메지루시 굿즈", "구원투수 등장", "블루파랑", "위저드리 린네 공략", "루시 노래", "경연 대회 우승", "금희 직캠", "스타세이비어 루미 공략", "명조 사주풀이"]) assert.equal(classify(title, "", { knownChannel: true }).accepted, false, title);
  assert.equal(classify("경연풀돌쇼", "", { knownChannel: true }).accepted, true);
  assert.equal(classify("간단하면서 고점까지 볼 수 있는 양모수 퀵스왑!").accepted, true);
  assert.equal(classify("여우별 단편 애니 감상").accepted, true);
  for (const title of ["카르티시아는 강하다", "장리의 공략", "쇄명의 모션", "히유키가 왔다"]) assert.equal(classify(title).accepted, true, title);
});

import "../config/wuthering-waves-search-config.js";

const config = globalThis.WUTHERING_WAVES_SEARCH_CONFIG;
export const normalizeWutheringText = (value) => String(value || "").normalize("NFKC");
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const termsPattern = (terms) => {
  const alternatives = terms.map((term) => escapeRegex(term).replace(/\s+/g, "\\s*")).sort((a, b) => b.length - a.length).join("|");
  const particles = "은|는|이|가|을|를|의|와|과|도|만|로|으로|에게|한테|랑|하고|보다|까지|부터|에서|이라|라고|라는|이며|이랑|입니다|임";
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${alternatives})(?=$|[^\\p{L}\\p{N}]|(?:${particles})(?=$|[^\\p{L}\\p{N}])|풀돌|풀재|가챠|공략|뽑기|단뽑|가이드|전투)`, "iu");
};
const gamePattern = /명조|워더링\s*웨이브|wuthering\s*waves|\bwuwa\b|鳴潮|鸣潮/i;
const ambiguousTerms = new Set(["경연", "방랑자", "설지", "능양", "절지", "유호", "수수", "연무", "루미", "양양", "알토", "감심", "구원", "청초", "루시", "단근", "도기", "페비", "금희", "기염", "산화"]);
const allTerms = [...new Set([...config.characters, ...(config.relatedTerms || []), "여우별", "여별", "양모수", "카멜탈", "에데치", "니보라", "라하이로이", "잔성", "공명자", "종말 매트릭스", "hiyuki", "cartethyia", "denia", "aemeath", "chisa", "sigrika", "camellya", "shorekeeper", "phrolova", "zani", "carlotta", "mornye", "lynae"])];
const uniquePattern = termsPattern(allTerms.filter((term) => !ambiguousTerms.has(term)));
const contextualPattern = termsPattern([...ambiguousTerms]);
const collisionPattern = /린네아|앙코르|치사량|(?:원신|소녀전선|마비카|두린).*방랑자|방랑자.*(?:원신|소녀전선|마비카|두린)|(?:roblox|로블록스|세일러\s*피스).*cartethyia|cartethyia.*(?:roblox|로블록스|세일러\s*피스)/i;
const unrelatedGamePattern = /퍼니싱\s*그레이\s*레이븐|punishing\s*gray\s*raven|#네티아만가/i;
const otherGameTitlePattern = /원신|젠레스|젠존제|붕괴|소녀전선|명일방주|블루\s*아카이브|로블록스|roblox|위저드리|wizardry|스타\s*세이비어|스세\s|나루토|이터널\s*리턴|오버워치|사이퍼즈|니케|nikke|스타레일|star\s*rail|로스트아크|로아|\bGTA\b|엔드필드|카배|배틀그라운드|pubg|마비노기|섀도우버스|shadowverse|림버스|limbus|헤븐\s*번즈\s*레드|컨커러스|페르소나|persona|그랑블루|이환|아이온|귀무자|스타크래프트|검은\s*신화\s*오공|퍼니싱|punishing|유희왕|마스터\s*듀얼|데바데|dead\s*by\s*daylight|제노니아|zenonia/i;
const wutheringContextPattern = /띵붕|띵조|무음\s*구역|종말\s*매트릭스|공명\s*(?:해방|스킬|효율|회로|체인)|(?:코스트|cost)\s*에코|에코\s*(?:세팅|스킬|파밍)/i;
const characterGameplayPattern = /풀돌|풀재|단뽑|뽑기|가챠|픽업|돌파|공략|가이드|전투\s*모션|조수\s*임무/i;
export const excludedWutheringChannelIds = new Set(["UCKuq0c-RXYaulECSuu5hFug"]);

// A bare tool name in a streamer's permanent description (for example their
// donation TTS service) does not disclose AI-generated video content.
const aiToken = "(?:\\bai\\b|인공지능|생성형\\s*ai|\\b(?:suno|udio|chatgpt|rvc|tts|nai)\\b)";
const aiAction = "(?:만들|만든|제작|생성|변환|보정|업스케일|합성|커버|번역|요약|만화|generated|made|created|cover|voice|music|image|video|animation|art)";
const aiDisclosure = new RegExp(`${aiToken}[^\\n.!?]{0,35}${aiAction}|${aiAction}[^\\n.!?]{0,35}${aiToken}`, "i");
const aiMediaDisclosure = /(?:\bai\b|인공지능|생성형\s*ai)\s*[:：-]?\s*(?:목소리|보이스|음악|영상|이미지|노래|그림|만화)|(?:목소리|보이스|음악|영상|이미지|노래|그림|만화)(?:은|는|을|를)?\s*[:：-]?\s*(?:\bai\b|인공지능)/i;
const aiTitleLabel = /(?:\bai\b|인공지능)\s*(?:아이돌|버튜버|그림|노래|음악|영상|이미지|목소리|보이스|커버|번역|요약)|\b(?:suno|udio|rvc)\b/i;

export function classifyWutheringVideo(value, { knownChannel = false, explicit = false } = {}) {
  const snippet = value.snippet || value;
  const title = normalizeWutheringText(snippet.title);
  const description = normalizeWutheringText(snippet.description);
  const tags = (snippet.tags || []).map(normalizeWutheringText).join(" ");
  const channelTitle = normalizeWutheringText(snippet.channelTitle || snippet.creator);
  const text = `${title}\n${description}\n${tags}`;
  if (excludedWutheringChannelIds.has(snippet.channelId)) return { accepted: false, reason: "official-channel" };
  const korean = /[가-힣]/.test(`${title} ${channelTitle}`) || /^ko(?:-|$)/i.test(snippet.defaultLanguage || snippet.defaultAudioLanguage || "");
  if (!korean && !explicit) return { accepted: false, reason: "non-korean" };
  if (aiTitleLabel.test(title) || aiDisclosure.test(text) || aiMediaDisclosure.test(text) || /#ai(?=$|[\s#.,])/i.test(text) || (snippet.tags || []).some((tag) => /^ai$/i.test(String(tag).trim())) || /^dear\s+ai$/i.test(channelTitle.trim())) return { accepted: false, reason: "disclosed-ai-use" };
  if (/사주|명리|직장운|식상|관살|사주팔자|운세/.test(`${title}\n${channelTitle}\n${description}`) && !/워더링|wuthering|wuwa|鳴潮|鸣潮/i.test(text) && !uniquePattern.test(title)) return { accepted: false, reason: "non-game-meaning-of-myeongjo" };
  const gameChapterEvidence = /\d{1,2}:\d{2}(?::\d{2})?[^\n]{0,80}(?:명조|워더링\s*웨이브|wuthering\s*waves|wuwa)/i.test(description);
  if (!explicit && !gamePattern.test(title) && !gameChapterEvidence && (collisionPattern.test(title) || (otherGameTitlePattern.test(title) && !uniquePattern.test(title)))) return { accepted: false, reason: "cross-game-title-with-promotional-metadata" };
  // Channel-wide tags and promotional links are reused on unrelated uploads.
  // A short #명조 description is meaningful; a hidden catch-all tag alone is not.
  const gameDescriptionEvidence = description.split(/\r?\n/).some((line) => {
    if (!gamePattern.test(line)) return false;
    if (/https?:\/\/|www\.|다운로드|쿠폰|후원|멤버[십쉽]|트위치|치지직|유튜브|채널|재생목록|플레이리스트|크리에이터\s*코드|브금|\bbgm\b|배경\s*음악|음악\s*출처|music\s*(?:credit|source)/i.test(line)) return false;
    if (/(?:방송|플레이).{0,12}(?:할\s*때|할때|시에는)|스포.{0,12}금지/.test(line)) return false;
    if (otherGameTitlePattern.test(line) && !/\d{1,2}:\d{2}/.test(line)) return false;
    return true;
  });
  const gameEvidence = gamePattern.test(title) || gameChapterEvidence || gameDescriptionEvidence;
  if (gameEvidence) return { accepted: true, reason: "explicit-game-metadata" };
  if (explicit) return { accepted: true, reason: "explicit-video-id" };
  if (collisionPattern.test(title) || unrelatedGamePattern.test(text) || otherGameTitlePattern.test(title)) return { accepted: false, reason: "cross-game-collision" };
  if (uniquePattern.test(title)) return { accepted: true, reason: "distinctive-title-term" };
  if (knownChannel && contextualPattern.test(title) && (wutheringContextPattern.test(text) || characterGameplayPattern.test(title))) return { accepted: true, reason: "contextual-title-term" };
  return { accepted: false, reason: "no-game-evidence" };
}

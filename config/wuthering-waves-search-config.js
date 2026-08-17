(() => {
  const baseQueries = [
    "명조", "명조 워더링 웨이브", "워더링 웨이브", "wuthering waves 명조",
    "명조 3.5", "명조 양양", "명조 현령", "명조 수수",
    "명조 공략", "명조 스토리", "명조 다시보기", "명조 리액션",
    "명조 쇼츠", "명조 shorts", "워더링 웨이브 쇼츠", "워더링 웨이브 shorts",
  ];

  const characters = [
    "방랑자", "설지", "산화", "능양", "절지", "유호", "카를로타", "히유키", "루실라", "수수",
    "치샤", "모르테피", "앙코", "장리", "브렌트", "루파", "갈브레나", "모니에", "에이메스", "데니아", "경연",
    "연무", "카카루", "음림", "상리요", "루미", "아우구스타", "복링", "레베카",
    "양양", "알토", "감심", "기염", "샤콘", "카르티시아", "유노", "구원", "시그리카", "청초",
    "벨리나", "금희", "파수인", "페비", "젠니", "린네", "루크·헤르센", "루시",
    "단근", "도기", "카멜리아", "로코코", "칸타렐라", "플로로", "치사", "양양·현령",
  ];

  const characterQueries = characters.map((name) => `명조 ${name}`);
  globalThis.WUTHERING_WAVES_SEARCH_CONFIG = Object.freeze({
    baseQueries: Object.freeze(baseQueries),
    characters: Object.freeze(characters),
    characterQueries: Object.freeze(characterQueries),
    allQueries: Object.freeze([...new Set([...baseQueries, ...characterQueries])]),
  });
})();

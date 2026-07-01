import MiniSearch from 'minisearch';
import { knowledgeDocs, moduleLabels, type KnowledgeCategory, type KnowledgeDoc } from '../data/knowledge';

export type AgentContext = {
  module: string;
  plan: 'free' | 'creator' | 'studio';
  sourceUrl?: string;
  workspaceName?: string;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  citations?: RagHit[];
  upgradeHint?: string;
};

export type RagHit = {
  id: string;
  title: string;
  category: KnowledgeCategory;
  module: string;
  score: number;
  snippet: string;
  confidence: KnowledgeDoc['confidence'];
};

type IndexedDoc = KnowledgeDoc & {
  searchText: string;
};

const indexedDocs: IndexedDoc[] = knowledgeDocs.map((doc) => ({
  ...doc,
  searchText: [doc.title, doc.body, doc.tags.join(' '), doc.category, doc.module].join('\n'),
}));

const search = new MiniSearch<IndexedDoc>({
  fields: ['title', 'body', 'tags', 'category', 'module', 'searchText'],
  storeFields: ['id', 'title', 'category', 'module', 'body', 'confidence'],
  searchOptions: {
    boost: {
      title: 2.4,
      tags: 1.8,
      module: 1.4,
      body: 1,
    },
    fuzzy: 0.16,
    prefix: true,
  },
});

search.addAll(indexedDocs);

const intentKeywords = {
  market: ['시장', '통계', '랭킹', '검색', '수요', '경쟁', '트렌드', '데이터'],
  planning: ['기획', '아이디어', '대사', '말투', '레퍼런스', '콘티', '검토'],
  embed: ['임베드', '위젯', '플로팅', '사이트', '공통', '스크립트'],
  pricing: ['가격', '구독', '플랜', '크레딧', '옵션', '무료'],
  workflow: ['흐름', '단계', '다음', '연결', '결과물', '실행물'],
};

function normalizeQuery(query: string, context: AgentContext) {
  const moduleName = moduleLabels[context.module] ?? context.module;
  return [query, moduleName, context.module].join(' ');
}

function buildSnippet(body: string, query: string) {
  const clean = body.replace(/\s+/g, ' ').trim();
  const tokens = query.split(/\s+/).filter((token) => token.length > 1);
  const hitIndex = tokens
    .map((token) => clean.indexOf(token))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];
  const start = Math.max(0, (hitIndex ?? 0) - 24);
  const snippet = clean.slice(start, start + 148);

  return snippet.length < clean.length ? `${snippet}...` : snippet;
}

function detectIntent(query: string) {
  const scores = Object.entries(intentKeywords).map(([intent, keywords]) => ({
    intent,
    score: keywords.reduce((sum, keyword) => sum + (query.includes(keyword) ? 1 : 0), 0),
  }));

  return scores.sort((a, b) => b.score - a.score)[0]?.intent ?? 'workflow';
}

function getContextBoost(doc: KnowledgeDoc, context: AgentContext, query: string) {
  let boost = 0;

  if (doc.module === context.module) boost += 1.4;
  if (doc.module === 'emomon') boost += 0.8;
  if (query.includes(doc.module)) boost += 0.8;
  if (context.plan === 'free' && doc.category === 'pricing') boost += 0.4;

  return boost;
}

export function retrieve(query: string, context: AgentContext, limit = 5): RagHit[] {
  const normalized = normalizeQuery(query, context);
  const rawResults = search.search(normalized, {
    combineWith: 'OR',
    filter: (result) => Boolean(result.id),
  });

  const byId = new Map<string, RagHit>();

  rawResults.forEach((result) => {
    const doc = knowledgeDocs.find((item) => item.id === result.id);
    if (!doc) return;

    const score = Number(result.score) + getContextBoost(doc, context, query);
    byId.set(doc.id, {
      id: doc.id,
      title: doc.title,
      category: doc.category,
      module: doc.module,
      score,
      snippet: buildSnippet(doc.body, query),
      confidence: doc.confidence,
    });
  });

  const currentModuleDoc = knowledgeDocs.find((doc) => doc.module === context.module && doc.category === 'module');
  if (currentModuleDoc && !byId.has(currentModuleDoc.id)) {
    byId.set(currentModuleDoc.id, {
      id: currentModuleDoc.id,
      title: currentModuleDoc.title,
      category: currentModuleDoc.category,
      module: currentModuleDoc.module,
      score: 1.2,
      snippet: buildSnippet(currentModuleDoc.body, query),
      confidence: currentModuleDoc.confidence,
    });
  }

  return Array.from(byId.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function buildContextLine(context: AgentContext) {
  const moduleName = moduleLabels[context.module] ?? '현재 서비스';
  const planLabel = context.plan === 'studio' ? 'Studio' : context.plan === 'creator' ? 'Creator' : 'Free';

  return `${moduleName} 컨텍스트와 ${planLabel} 플랜 기준으로 답변합니다.`;
}

function buildUpgradeHint(query: string, context: AgentContext) {
  const needsDeepRag = ['통계', '시장', '검색', '전체', '히스토리', '대량', '비교'].some((keyword) => query.includes(keyword));

  if (context.plan !== 'free' || !needsDeepRag) return undefined;

  return '심층 시장 RAG, 워크스페이스 전체 히스토리 비교, 외부 검색 데이터 연결은 Creator 이상 옵션으로 두는 구성이 적합합니다.';
}

function buildAnswerBullets(query: string, hits: RagHit[], context: AgentContext) {
  const intent = detectIntent(query);
  const moduleName = moduleLabels[context.module] ?? context.module;

  if (intent === 'market') {
    return [
      '시장 검증은 수요 신호, 경쟁 강도, 제작 적합도, 상품화 여지를 분리해서 봐야 합니다.',
      `${moduleName}에서 나온 실행물은 EmoTrend 리포트와 함께 묶어야 근거가 생깁니다.`,
      '현재 내장 데이터는 검증 기준표와 샘플 지표이며, 실제 랭킹/검색 데이터 연결 후 신뢰도를 높이는 구조입니다.',
    ];
  }

  if (intent === 'planning') {
    return [
      '기획 검증은 콘셉트 한 문장, 사용 상황, 캐릭터 성격, 말투 규칙, 레퍼런스 차별점을 먼저 확인합니다.',
      '대사와 레퍼런스 비교는 EmoSketch로 넘기고, Emomon은 빠진 항목과 다음 검증 질문을 잡는 역할이 맞습니다.',
      '결과물은 다음 제작 단계에서 다시 읽을 수 있도록 요약, 근거, 보류 질문으로 나눠 저장하는 편이 좋습니다.',
    ];
  }

  if (intent === 'embed') {
    return [
      '각 제품은 중앙 스크립트 한 줄만 삽입하고 실제 채팅 화면은 Emomon의 위젯 라우트에서 렌더링합니다.',
      '이 방식은 사이트마다 챗봇 로직을 복사하지 않아도 되어 단일 진실을 유지하기 쉽습니다.',
      '위젯은 현재 모듈, 플랜, 출처 URL을 컨텍스트로 넘겨 같은 질문도 서비스 상황에 맞게 답할 수 있습니다.',
    ];
  }

  if (intent === 'pricing') {
    return [
      '기본 도움말과 현재 서비스 컨텍스트 검색은 무료로 열어두는 편이 초기 사용 장벽을 낮춥니다.',
      '심층 시장 검색, 외부 데이터 RAG, 대량 결과물 비교는 옵션 또는 구독 기능으로 안내하는 구성이 자연스럽습니다.',
      '구독 안내는 대화 진입 전에 막지 말고, 사용자가 고급 검증을 요청하는 순간에 보여주는 편이 덜 부담스럽습니다.',
    ];
  }

  return [
    `${moduleName}의 현재 역할과 다음 단계 결과물을 먼저 확인합니다.`,
    '허브 전체 흐름에서는 시장 분석, 기획 검증, 생성, 편집, 출시 준비가 이어집니다.',
    '답변에는 사용한 근거 문서를 함께 표시해 나중에 RAG 평가셋으로 전환할 수 있게 합니다.',
  ];
}

export function composeAnswer(query: string, context: AgentContext): Omit<ChatMessage, 'id' | 'createdAt'> {
  const hits = retrieve(query, context);
  const bullets = buildAnswerBullets(query, hits, context);
  const topTitles = hits.slice(0, 3).map((hit) => `「${hit.title}」`).join(', ');
  const upgradeHint = buildUpgradeHint(query, context);
  const content = [
    buildContextLine(context),
    '',
    ...bullets.map((bullet) => `- ${bullet}`),
    '',
    topTitles ? `참조한 근거: ${topTitles}` : '참조한 근거: 현재 모듈 컨텍스트',
  ].join('\n');

  return {
    role: 'assistant',
    content,
    citations: hits,
    upgradeHint,
  };
}

export function createMessage(role: ChatMessage['role'], content: string): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

export function getStarterQuestions(context: AgentContext) {
  const moduleName = moduleLabels[context.module] ?? '현재 서비스';

  return [
    `${moduleName} 결과물을 어떻게 검증해야 해?`,
    '시장 검색 단계에서 어떤 통계 기준을 봐야 해?',
    '이 챗봇을 다른 서비스에 임베드하는 방식 설명해줘',
  ];
}


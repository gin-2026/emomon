import { knowledgeDocs, moduleLabels, type KnowledgeCategory, type KnowledgeDoc } from './knowledge';

export type AgentPlan = 'free' | 'creator' | 'studio';

export type AgentContext = {
  module: string;
  plan: AgentPlan;
  sourceUrl?: string;
  workspaceName?: string;
};

export type ChatRole = 'user' | 'assistant';

export type RagHit = {
  id: string;
  title: string;
  category: KnowledgeCategory;
  module: string;
  sourceType: KnowledgeDoc['sourceType'];
  updatedAt: string;
  confidence: KnowledgeDoc['confidence'];
  tags: string[];
  score: number;
  snippet: string;
  metrics?: KnowledgeDoc['metrics'];
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  citations?: RagHit[];
  upgradeHint?: string;
};

export const moduleOptions = [
  'hub',
  'emo-trend',
  'emomon',
  'emo-sketch',
  'ai-emoticon-maker',
  'c-canvas-pro',
  'any-stripe',
  'ip-builder',
];

export const planOptions: AgentPlan[] = ['free', 'creator', 'studio'];

export const categoryLabel: Record<KnowledgeCategory, string> = {
  module: '제품 컨텍스트',
  market: '시장 검증',
  planning: '기획 기준',
  validation: '검증',
  pricing: '플랜 안내',
  workflow: '워크플로우',
  embed: '임베드',
};

const planLabels: Record<AgentPlan, string> = {
  free: 'Free',
  creator: 'Creator',
  studio: 'Studio',
};

export function formatPlan(plan: AgentPlan) {
  return planLabels[plan] ?? 'Free';
}

export function normalizeContext(context: Partial<AgentContext> | undefined): AgentContext {
  const module = context?.module && moduleOptions.includes(context.module) ? context.module : 'hub';
  const plan = context?.plan && planOptions.includes(context.plan) ? context.plan : 'free';

  return {
    module,
    plan,
    sourceUrl: context?.sourceUrl,
    workspaceName: context?.workspaceName || 'Demo workspace',
  };
}

export function createMessage(role: ChatRole, content: string): ChatMessage {
  const fallback = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : fallback,
    role,
    content,
  };
}

export function buildInitialMessage(contextInput: AgentContext): ChatMessage {
  const context = normalizeContext(contextInput);
  const moduleName = moduleLabels[context.module] ?? '현재 서비스';

  return {
    ...createMessage(
      'assistant',
      [
        `안녕하세요. 저는 ${moduleName} 컨텍스트를 읽는 Emomon입니다.`,
        '',
        '- 현재 페이지의 역할과 EmoHub 전체 제작 흐름을 함께 기준으로 삼습니다.',
        '- 시장 검색, 기획 검증, 결과물 비교 질문에 근거 문서를 붙여 답합니다.',
        '- 문서를 추가하면 해당 내용을 청킹하고 벡터 검색 대상으로 보낼 수 있습니다.',
      ].join('\n'),
    ),
    citations: retrieveLocal('현재 서비스 컨텍스트와 시장 검증 기준', context, 4),
  };
}

function tokenize(text: string) {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length > 1),
    ),
  );
}

function makeSnippet(doc: KnowledgeDoc, queryTokens: string[]) {
  const sentences = doc.body.split(/(?<=[.!?。]|[.])\s+|(?<=다\.)\s*/).filter(Boolean);
  const matched = sentences.find((sentence) => {
    const lower = sentence.toLowerCase();
    return queryTokens.some((token) => lower.includes(token));
  });
  const source = matched || doc.body;

  return source.length > 180 ? `${source.slice(0, 180)}...` : source;
}

function scoreDoc(doc: KnowledgeDoc, queryTokens: string[], context: AgentContext) {
  const haystack = tokenize(`${doc.title} ${doc.tags.join(' ')} ${doc.body} ${doc.category} ${doc.module}`);
  const haystackSet = new Set(haystack);
  const tokenScore = queryTokens.reduce((score, token) => score + (haystackSet.has(token) ? 3 : 0), 0);
  const partialScore = queryTokens.reduce(
    (score, token) => score + (haystack.some((candidate) => candidate.includes(token) || token.includes(candidate)) ? 1 : 0),
    0,
  );
  const moduleBoost = doc.module === context.module ? 5 : doc.module === 'emomon' || doc.module === 'hub' ? 2 : 0;
  const planBoost =
    ['플랜', '구독', '크레딧', '옵션', 'pricing', 'plan'].some((word) => queryTokens.includes(word)) &&
    doc.category === 'pricing'
      ? 5
      : 0;

  return tokenScore + partialScore + moduleBoost + planBoost;
}

export function retrieveLocal(query: string, contextInput: AgentContext, limit = 5): RagHit[] {
  const context = normalizeContext(contextInput);
  const queryTokens = tokenize(`${query} ${moduleLabels[context.module] ?? context.module} ${context.plan}`);

  return knowledgeDocs
    .map((doc) => ({
      doc,
      score: scoreDoc(doc, queryTokens, context),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ doc, score }) => ({
      id: doc.id,
      title: doc.title,
      category: doc.category,
      module: doc.module,
      sourceType: doc.sourceType,
      updatedAt: doc.updatedAt,
      confidence: doc.confidence,
      tags: doc.tags,
      metrics: doc.metrics,
      score,
      snippet: makeSnippet(doc, queryTokens),
    }));
}

export function getStarterQuestions(contextInput: AgentContext) {
  const context = normalizeContext(contextInput);
  const moduleName = moduleLabels[context.module] ?? '현재 서비스';

  if (context.module === 'emo-sketch') {
    return ['대사 후보를 비교할 기준은?', '레퍼런스 문서를 어떻게 넣나요?', '색 추천은 어떤 근거로 하나요?'];
  }

  if (context.module === 'ip-builder') {
    return ['Creator 이상에서 필요한 이유는?', '상품화 문서에는 무엇이 들어가나요?', '런치팩과 어떻게 분리하나요?'];
  }

  return [`${moduleName}에서 먼저 볼 기준은?`, '시장 검증을 3단계로 정리해줘', '문서 기반 RAG는 어떻게 연결돼?'];
}

function shouldShowUpgrade(query: string, context: AgentContext) {
  const tokens = tokenize(query);
  const wantsAdvanced = ['시장', '통계', '비교', '대량', '워크스페이스', '히스토리', 'rag', 'vector'].some((token) =>
    tokens.includes(token),
  );

  return context.plan === 'free' && wantsAdvanced;
}

export function composeFallbackAnswer(query: string, contextInput: AgentContext, hits = retrieveLocal(query, contextInput, 4)) {
  const context = normalizeContext(contextInput);
  const moduleName = moduleLabels[context.module] ?? '현재 서비스';

  if (hits.length === 0) {
    return {
      content: [
        `현재 연결된 ${moduleName} 문서에서 직접 근거를 찾지 못했습니다.`,
        '확인하려는 기획안, 레퍼런스 문서, 비교 기준을 문서 추가 영역에 넣으면 같은 인터페이스로 다시 검색할 수 있습니다.',
      ].join('\n'),
      citations: [],
      upgradeHint: undefined,
    };
  }

  const sourceLines = hits.slice(0, 3).map((hit, index) => `${index + 1}. ${hit.title}: ${hit.snippet}`);

  return {
    content: [
      `${moduleName} 기준으로 보면 다음 순서로 판단하는 것이 좋습니다.`,
      '',
      ...sourceLines,
      '',
      '실행 기준: 먼저 현재 서비스의 역할을 확정하고, 그다음 시장 신호와 제작 난이도, 마지막으로 결과물 확장 가능성을 분리해서 보세요.',
    ].join('\n'),
    citations: hits,
    upgradeHint: shouldShowUpgrade(query, context)
      ? '심층 시장 RAG, 통계 자산 연결, 워크스페이스 전체 히스토리 분석은 Creator 이상 옵션으로 분리하는 편이 적합합니다.'
      : undefined,
  };
}

export function buildGroundingContext(hits: RagHit[]) {
  return hits
    .map(
      (hit, index) =>
        `[${index + 1}] ${hit.title}\n분류: ${categoryLabel[hit.category]}\n신뢰도: ${hit.confidence}\n본문: ${hit.snippet}`,
    )
    .join('\n\n');
}

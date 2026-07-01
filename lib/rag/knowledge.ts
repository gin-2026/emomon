export type KnowledgeCategory =
  | 'module'
  | 'market'
  | 'planning'
  | 'validation'
  | 'pricing'
  | 'workflow'
  | 'embed';

export type KnowledgeDoc = {
  id: string;
  title: string;
  category: KnowledgeCategory;
  module: string;
  sourceType: 'product' | 'market-asset' | 'workflow' | 'policy' | 'implementation' | 'manual';
  updatedAt: string;
  confidence: 'high' | 'medium' | 'draft';
  tags: string[];
  body: string;
  metrics?: Array<{
    label: string;
    value: string;
    note: string;
  }>;
};

export const knowledgeDocs: KnowledgeDoc[] = [
  {
    id: 'module-emohub',
    title: 'EmoHub 통합 제작 허브',
    category: 'module',
    module: 'hub',
    sourceType: 'product',
    updatedAt: '2026-07-01',
    confidence: 'high',
    tags: ['허브', '워크스페이스', '크레딧', '솔루션', '런치'],
    body:
      'EmoHub는 이모티콘 제작 흐름을 시장 분석, 기획 검토, 이미지 생성, 캔버스 편집, 모션 편집, IP 패키징으로 연결하는 통합 허브입니다. 각 실행물은 독립 앱이지만 허브 기준에서는 하나의 제작 파이프라인으로 설명되어야 합니다.',
  },
  {
    id: 'module-trend',
    title: 'EmoTrend 시장 검색과 트렌드 분석',
    category: 'module',
    module: 'emo-trend',
    sourceType: 'product',
    updatedAt: '2026-07-01',
    confidence: 'high',
    tags: ['시장검색', '트렌드', '랭킹', '키워드', '통계'],
    body:
      'EmoTrend는 인기·신규 흐름, 감정 키워드, 스타일 패턴을 리포트로 정리하는 시장 감지 단계입니다. 기획 이전에 근거가 되는 키워드와 콘셉트 방향을 좁히는 용도로 사용합니다.',
    metrics: [
      { label: '검증 초점', value: '수요 신호', note: '인기 흐름과 신규 진입 콘셉트의 차이를 비교합니다.' },
      { label: '출력물', value: '트렌드 리포트', note: 'EmoSketch와 Emomon 검증 컨텍스트로 이어집니다.' },
    ],
  },
  {
    id: 'module-emomon',
    title: 'Emomon 공통 컨텍스트 에이전트',
    category: 'module',
    module: 'emomon',
    sourceType: 'product',
    updatedAt: '2026-07-02',
    confidence: 'draft',
    tags: ['챗봇', '에이전트', 'RAG', '컨텍스트', '검증'],
    body:
      'Emomon은 EmoHub에 소속된 실행물, 결과물, 솔루션별 역할을 함께 읽고 질문에 답하는 공통 AI 에이전트입니다. 독립 서비스로 실행되며, 다른 제품에는 하단 우측 플로팅 채팅 위젯으로 임베드됩니다.',
  },
  {
    id: 'module-sketch',
    title: 'EmoSketch 기획 리뷰 노트',
    category: 'module',
    module: 'emo-sketch',
    sourceType: 'product',
    updatedAt: '2026-07-01',
    confidence: 'high',
    tags: ['기획', '대사', '말투', '레퍼런스', '색추천'],
    body:
      'EmoSketch는 기존 대사 목록, 새 대사 후보, 레퍼런스 문서를 비교해 말투 일관성, 감정 전달, 레퍼런스 적합도, 색 방향을 검토합니다. 생성기가 아니라 제작 전 선택 기준을 세우는 리뷰 노트입니다.',
  },
  {
    id: 'module-maker',
    title: 'AI Emoticon Maker 생성 단계',
    category: 'module',
    module: 'ai-emoticon-maker',
    sourceType: 'product',
    updatedAt: '2026-07-01',
    confidence: 'high',
    tags: ['생성', '캐릭터', '프롬프트', '이미지', '시안'],
    body:
      'AI Emoticon Maker는 트렌드 리포트와 기획 문장을 캐릭터 콘셉트, 표정, 포즈, 이모티콘 세트 후보로 전환하는 생성 단계입니다.',
  },
  {
    id: 'module-canvas',
    title: 'C Canvas Pro 편집 단계',
    category: 'module',
    module: 'c-canvas-pro',
    sourceType: 'product',
    updatedAt: '2026-07-01',
    confidence: 'high',
    tags: ['캔버스', '레이아웃', '편집', '에셋', '규격'],
    body:
      'C Canvas Pro는 생성된 에셋의 크기, 여백, 배경, 문구, 구성을 캔버스에서 정리해 제출 가능한 품질에 가깝게 다듬는 편집 단계입니다.',
  },
  {
    id: 'module-stripe',
    title: 'AniStripe 모션 편집 단계',
    category: 'module',
    module: 'any-stripe',
    sourceType: 'product',
    updatedAt: '2026-07-01',
    confidence: 'high',
    tags: ['애니메이션', 'GIF', '스프라이트', '프레임', '내보내기'],
    body:
      'AniStripe는 스프라이트 시트를 자르고 프레임 타이밍을 조정해 GIF와 제출용 모션 에셋을 만드는 마감 단계입니다.',
  },
  {
    id: 'module-ip',
    title: 'IP Builder 상품화 단계',
    category: 'module',
    module: 'ip-builder',
    sourceType: 'product',
    updatedAt: '2026-07-01',
    confidence: 'high',
    tags: ['IP', '세계관', '사용규칙', '상품화', '브랜드'],
    body:
      'IP Builder는 완성된 캐릭터를 이름, 성격, 금지 표현, 사용 규칙, 캠페인 활용 방향으로 정리해 브랜드와 상품화에 쓸 수 있는 문서로 패키징합니다. Creator 플랜 이상에서 사용하는 고급 단계로 둡니다.',
  },
  {
    id: 'market-validation-matrix',
    title: '시장 검증 매트릭스',
    category: 'market',
    module: 'emomon',
    sourceType: 'market-asset',
    updatedAt: '2026-07-02',
    confidence: 'draft',
    tags: ['시장검증', '통계', '수요', '경쟁강도', '반복구매'],
    body:
      '시장 검증은 수요 신호, 경쟁 강도, 제작 난이도, 반복 사용성, 플랫폼 적합도를 분리해서 봅니다. 초기에는 실제 외부 데이터가 충분하지 않으므로 내부 기준표와 샘플 지표를 사용하고, 이후 EmoTrend 수집 데이터와 검색 RAG를 연결합니다.',
    metrics: [
      { label: '수요 신호', value: '35%', note: '키워드 반복 노출, 최근성, 사용 상황 명확도 가중치입니다.' },
      { label: '경쟁 강도', value: '25%', note: '유사 콘셉트 밀도와 차별 포인트 부족 위험을 봅니다.' },
      { label: '제작 적합도', value: '20%', note: '표정 수, 동작 난이도, 일관성 유지 가능성을 평가합니다.' },
      { label: '상품화 여지', value: '20%', note: 'IP 확장성, 굿즈화 가능성, 브랜드 협업 적합도입니다.' },
    ],
  },
  {
    id: 'planning-review-rubric',
    title: '기획 검증 루브릭',
    category: 'planning',
    module: 'emomon',
    sourceType: 'workflow',
    updatedAt: '2026-07-02',
    confidence: 'medium',
    tags: ['기획', '검증', '루브릭', '대사', '레퍼런스'],
    body:
      '기획 검증은 한 문장 콘셉트, 사용 상황, 캐릭터 성격, 말투 규칙, 금지 표현, 레퍼런스 차별점을 함께 봅니다. Emomon은 질문 단계에서 빠진 항목을 묻고, EmoSketch는 대사와 레퍼런스 비교를 수행합니다.',
  },
  {
    id: 'rag-implementation',
    title: 'RAG 구현 경계',
    category: 'workflow',
    module: 'emomon',
    sourceType: 'implementation',
    updatedAt: '2026-07-02',
    confidence: 'medium',
    tags: ['RAG', '검색', '인덱스', '임베딩', '평가셋'],
    body:
      'Emomon의 검색 레이어는 지식 문서, 메타데이터, 검색 결과, 응답 생성을 분리합니다. 현재는 로컬 검색 백업과 Upstash Vector 검색을 같은 인터페이스 뒤에 두고, 환경변수가 있으면 Gemini 임베딩 기반 검색으로 전환됩니다.',
  },
  {
    id: 'pricing-upgrade',
    title: '채팅 옵션과 플랜 안내',
    category: 'pricing',
    module: 'hub',
    sourceType: 'policy',
    updatedAt: '2026-07-02',
    confidence: 'draft',
    tags: ['무료', '구독', '옵션', '크레딧', '플랜'],
    body:
      '하단 우측 플로팅 채팅은 모든 사이트에서 기본 도움말과 컨텍스트 검색을 제공합니다. 심층 시장 RAG, 대량 결과물 비교, 워크스페이스 전체 히스토리 분석은 구독 또는 크레딧 기능으로 안내하는 옵션이 적합합니다.',
  },
  {
    id: 'embed-contract',
    title: 'Emomon 임베드 계약',
    category: 'embed',
    module: 'emomon',
    sourceType: 'implementation',
    updatedAt: '2026-07-02',
    confidence: 'high',
    tags: ['임베드', '위젯', '플로팅', '단일진실', 'iframe'],
    body:
      '각 제품은 중앙 스크립트 emomon-embed.js만 삽입합니다. 스크립트는 하단 우측 버튼과 iframe 패널을 만들고, 실제 채팅 화면은 Emomon의 /widget 라우트에서 렌더링됩니다. 이렇게 하면 서비스별 코드 중복 없이 위젯을 업데이트할 수 있습니다.',
  },
];

export const moduleLabels: Record<string, string> = {
  hub: 'EmoHub',
  'emo-trend': 'EmoTrend',
  emomon: 'Emomon',
  'emo-sketch': 'EmoSketch',
  'ai-emoticon-maker': 'AI Emoticon Maker',
  'c-canvas-pro': 'C Canvas Pro',
  'any-stripe': 'AniStripe',
  'ip-builder': 'IP Builder',
};

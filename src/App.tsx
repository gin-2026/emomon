import React from 'react';
import {
  ArrowUpRight,
  BarChart3,
  Bot,
  CheckCircle2,
  ClipboardCopy,
  Database,
  FileSearch,
  LockKeyhole,
  MessageCircle,
  PlugZap,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  composeAnswer,
  createMessage,
  getStarterQuestions,
  retrieve,
  type AgentContext,
  type ChatMessage,
  type RagHit,
} from './lib/rag';
import { knowledgeDocs, moduleLabels } from './data/knowledge';

const moduleOptions = [
  'hub',
  'emo-trend',
  'emomon',
  'emo-sketch',
  'ai-emoticon-maker',
  'c-canvas-pro',
  'any-stripe',
  'ip-builder',
];

const planOptions: AgentContext['plan'][] = ['free', 'creator', 'studio'];

const categoryLabel: Record<RagHit['category'], string> = {
  module: '제품 컨텍스트',
  market: '시장 검증',
  planning: '기획 기준',
  validation: '검증',
  pricing: '플랜 안내',
  workflow: '워크플로우',
  embed: '임베드',
};

function readContextFromUrl(): AgentContext {
  const params = new URLSearchParams(window.location.search);
  const module = params.get('module') || params.get('product') || 'hub';
  const plan = params.get('plan') as AgentContext['plan'] | null;
  const sourceUrl = params.get('source') || document.referrer || undefined;

  return {
    module: moduleOptions.includes(module) ? module : 'hub',
    plan: plan && planOptions.includes(plan) ? plan : 'free',
    sourceUrl,
    workspaceName: params.get('workspace') || 'Demo workspace',
  };
}

function formatPlan(plan: AgentContext['plan']) {
  if (plan === 'studio') return 'Studio';
  if (plan === 'creator') return 'Creator';
  return 'Free';
}

function buildInitialMessage(context: AgentContext): ChatMessage {
  const moduleName = moduleLabels[context.module] ?? '현재 서비스';

  return {
    ...createMessage(
      'assistant',
      [
        `안녕하세요. 저는 ${moduleName} 컨텍스트를 읽는 Emomon입니다.`,
        '',
        '- 현재 페이지의 역할과 EmoHub 전체 제작 흐름을 함께 기준으로 삼습니다.',
        '- 시장 검색, 기획 검증, 결과물 비교 질문에 근거 문서를 붙여 답합니다.',
        '- 심층 RAG와 외부 통계 연결은 Creator 이상 옵션으로 안내할 수 있습니다.',
      ].join('\n'),
    ),
    citations: retrieve('현재 서비스 컨텍스트와 시장 검증 기준', context, 4),
  };
}

function ConfidenceBadge({ value }: { value: RagHit['confidence'] }) {
  const label = value === 'high' ? '확정' : value === 'medium' ? '검토중' : '초안';
  const className =
    value === 'high'
      ? 'bg-emerald-50 text-emerald-700'
      : value === 'medium'
        ? 'bg-amber-50 text-amber-700'
        : 'bg-zinc-100 text-zinc-600';

  return <span className={`rounded-md px-2 py-1 text-[0.7rem] font-black ${className}`}>{label}</span>;
}

function CitationCard({ hit }: { hit: RagHit }) {
  return (
    <div className="border border-zinc-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-cyan-700">{categoryLabel[hit.category]}</p>
          <h4 className="mt-1 text-sm font-black leading-5 text-zinc-950">{hit.title}</h4>
        </div>
        <ConfidenceBadge value={hit.confidence} />
      </div>
      <p className="mt-2 text-xs font-semibold leading-5 text-zinc-600">{hit.snippet}</p>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <article className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[88%] border p-4 ${
          isUser ? 'border-zinc-950 bg-zinc-950 text-white' : 'border-zinc-200 bg-white text-zinc-950 shadow-sm'
        }`}
      >
        <div className="mb-2 flex items-center gap-2">
          {isUser ? <MessageCircle size={16} /> : <Bot size={16} className="text-cyan-700" />}
          <span className="text-xs font-black uppercase text-current/60">{isUser ? 'You' : 'Emomon'}</span>
        </div>
        <p className="whitespace-pre-line text-sm font-semibold leading-6">{message.content}</p>
        {message.upgradeHint && (
          <div className="mt-4 border border-amber-200 bg-amber-50 p-3 text-zinc-950">
            <div className="flex items-start gap-2">
              <LockKeyhole className="mt-0.5 shrink-0 text-amber-600" size={16} />
              <p className="text-xs font-bold leading-5">{message.upgradeHint}</p>
            </div>
          </div>
        )}
        {message.citations && message.citations.length > 0 && !isUser && (
          <div className="mt-4 space-y-2">
            {message.citations.slice(0, 2).map((hit) => (
              <CitationCard key={hit.id} hit={hit} />
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

function ContextPanel({
  context,
  setContext,
}: {
  context: AgentContext;
  setContext: React.Dispatch<React.SetStateAction<AgentContext>>;
}) {
  const currentDocs = retrieve('현재 서비스 컨텍스트 검증', context, 3);

  return (
    <aside className="space-y-4">
      <section className="border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase text-cyan-700">Context</p>
            <h2 className="mt-1 text-2xl font-black">현재 기준</h2>
          </div>
          <ShieldCheck className="text-zinc-950" size={26} />
        </div>

        <label className="mt-5 block text-xs font-black uppercase text-zinc-500" htmlFor="module-select">
          서비스
        </label>
        <select
          id="module-select"
          value={context.module}
          onChange={(event) => setContext((prev) => ({ ...prev, module: event.target.value }))}
          className="mt-2 w-full border border-zinc-300 bg-white px-3 py-3 text-sm font-black text-zinc-950"
        >
          {moduleOptions.map((id) => (
            <option key={id} value={id}>
              {moduleLabels[id] ?? id}
            </option>
          ))}
        </select>

        <label className="mt-4 block text-xs font-black uppercase text-zinc-500" htmlFor="plan-select">
          플랜
        </label>
        <select
          id="plan-select"
          value={context.plan}
          onChange={(event) =>
            setContext((prev) => ({ ...prev, plan: event.target.value as AgentContext['plan'] }))
          }
          className="mt-2 w-full border border-zinc-300 bg-white px-3 py-3 text-sm font-black text-zinc-950"
        >
          {planOptions.map((plan) => (
            <option key={plan} value={plan}>
              {formatPlan(plan)}
            </option>
          ))}
        </select>

        <div className="mt-5 border-t border-zinc-100 pt-4">
          <p className="text-xs font-black uppercase text-zinc-400">출처</p>
          <p className="mt-2 text-xs font-bold leading-5 text-zinc-600">
            {context.sourceUrl || '직접 실행된 Emomon 서비스'}
          </p>
        </div>
      </section>

      <section className="border border-zinc-200 bg-zinc-950 p-5 text-white shadow-sm">
        <div className="flex items-center gap-2">
          <Database size={18} className="text-cyan-300" />
          <h3 className="text-lg font-black">검색되는 자산</h3>
        </div>
        <div className="mt-4 space-y-3">
          {currentDocs.map((hit) => (
            <div key={hit.id} className="border border-white/10 bg-white/5 p-3">
              <p className="text-xs font-black text-cyan-200">{categoryLabel[hit.category]}</p>
              <p className="mt-1 text-sm font-black leading-5">{hit.title}</p>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}

function ChatPanel({
  context,
  embedded = false,
}: {
  context: AgentContext;
  embedded?: boolean;
}) {
  const [messages, setMessages] = React.useState<ChatMessage[]>(() => [buildInitialMessage(context)]);
  const [input, setInput] = React.useState('');
  const starterQuestions = getStarterQuestions(context);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    setMessages([buildInitialMessage(context)]);
  }, [context.module, context.plan]);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const submitQuestion = (value: string) => {
    const question = value.trim();
    if (!question) return;

    const userMessage = createMessage('user', question);
    const answer = {
      ...createMessage('assistant', composeAnswer(question, context).content),
      ...composeAnswer(question, context),
    };

    setMessages((prev) => [...prev, userMessage, answer]);
    setInput('');
  };

  return (
    <section className={`flex min-h-0 flex-col border border-zinc-200 bg-zinc-50 shadow-sm ${embedded ? 'h-screen' : 'h-[44rem]'}`}>
      <header className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-950 text-sm font-black text-white">
            M
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-black">Emomon</h2>
            <p className="truncate text-xs font-bold text-zinc-500">
              {moduleLabels[context.module] ?? context.module} · {formatPlan(context.plan)}
            </p>
          </div>
        </div>
        <a
          href="/"
          target={embedded ? '_blank' : undefined}
          className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-3 py-2 text-xs font-black text-zinc-600 hover:border-zinc-950 hover:text-zinc-950"
        >
          전체 화면 <ArrowUpRight size={13} />
        </a>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </div>

      <div className="border-t border-zinc-200 bg-white p-4">
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {starterQuestions.map((question) => (
            <button
              key={question}
              type="button"
              onClick={() => submitQuestion(question)}
              className="shrink-0 rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-black text-zinc-600 hover:border-cyan-600 hover:text-cyan-700"
            >
              {question}
            </button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            submitQuestion(input);
          }}
        >
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="검증할 기획, 시장 검색, 결과물 질문을 입력하세요"
            className="min-w-0 flex-1 border border-zinc-300 bg-white px-3 py-3 text-sm font-semibold outline-none focus:border-cyan-600"
          />
          <button
            type="submit"
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-zinc-950 text-white hover:bg-cyan-700"
            aria-label="질문 보내기"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </section>
  );
}

function AssetPanel({ context }: { context: AgentContext }) {
  const [query, setQuery] = React.useState('시장 검증 통계 RAG 임베드');
  const hits = retrieve(query, context, 6);
  const snippet = `<script defer src="https://emomon.vercel.app/emomon-embed.js" data-emomon-module="${context.module}" data-emomon-plan="${context.plan}"></script>`;

  const copySnippet = async () => {
    await navigator.clipboard.writeText(snippet);
  };

  return (
    <aside className="space-y-4">
      <section className="border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Search size={18} className="text-cyan-700" />
          <h3 className="text-lg font-black">RAG 검색 테스트</h3>
        </div>
        <div className="mt-4 flex gap-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-w-0 flex-1 border border-zinc-300 px-3 py-2 text-sm font-bold outline-none focus:border-cyan-600"
          />
          <button
            type="button"
            onClick={() => setQuery('시장 검증 통계 RAG 임베드')}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-zinc-200 text-zinc-600 hover:border-zinc-950 hover:text-zinc-950"
            aria-label="검색어 초기화"
          >
            <RefreshCw size={16} />
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {hits.map((hit) => (
            <CitationCard key={hit.id} hit={hit} />
          ))}
        </div>
      </section>

      <section className="border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <PlugZap size={18} className="text-cyan-700" />
          <h3 className="text-lg font-black">임베드 스니펫</h3>
        </div>
        <p className="mt-3 text-sm font-semibold leading-6 text-zinc-600">
          각 서비스에는 중앙 스크립트만 넣고, 실제 채팅은 Emomon 위젯 라우트에서 실행합니다.
        </p>
        <pre className="mt-4 overflow-x-auto border border-zinc-200 bg-zinc-50 p-3 text-xs font-bold leading-5 text-zinc-700">
          <code>{snippet}</code>
        </pre>
        <button
          type="button"
          onClick={copySnippet}
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-zinc-950 px-4 py-3 text-sm font-black text-white hover:bg-cyan-700"
        >
          스니펫 복사 <ClipboardCopy size={16} />
        </button>
      </section>

      <section className="border border-zinc-200 bg-zinc-950 p-5 text-white shadow-sm">
        <p className="text-xs font-black uppercase text-amber-300">Options</p>
        <h3 className="mt-2 text-xl font-black">구독 안내 시점</h3>
        <div className="mt-4 space-y-3">
          {[
            ['Free', '현재 페이지 도움말, 제품 컨텍스트 검색, 기본 검증 질문'],
            ['Creator', '시장 검색 RAG, 통계 자산 연결, 기획안 심층 비교'],
            ['Studio', '팀 워크스페이스 전체 히스토리, 결과물 대량 비교, 공유 리포트'],
          ].map(([title, body]) => (
            <div key={title} className="border border-white/10 bg-white/5 p-3">
              <p className="text-sm font-black">{title}</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-white/65">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}

function StandaloneApp() {
  const [context, setContext] = React.useState<AgentContext>(() => readContextFromUrl());

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-950">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-950 text-lg font-black text-white">
              M
            </span>
            <div>
              <p className="text-sm font-black uppercase text-cyan-700">EmoHub Context Agent</p>
              <h1 className="text-3xl font-black tracking-normal">Emomon</h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              ['공통 위젯', PlugZap],
              ['RAG 준비 구조', Database],
              ['시장 검증', BarChart3],
              ['기획 컨텍스트', FileSearch],
            ].map(([label, Icon]) => {
              const TypedIcon = Icon as typeof PlugZap;
              return (
                <span key={label as string} className="inline-flex items-center gap-2 border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-black text-zinc-700">
                  <TypedIcon size={15} />
                  {label as string}
                </span>
              );
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {[
            ['모든 제품에서 같은 채팅', '중앙 임베드 스크립트와 위젯 라우트로 챗봇 코드를 한 곳에서 관리합니다.'],
            ['컨텍스트 기반 검증', '현재 서비스, 허브 실행물, 결과물 흐름을 함께 읽고 답변 근거를 표시합니다.'],
            ['시장·기획 RAG 준비', '내장 기준표와 검색 레이어를 분리해 실제 통계 자산을 나중에 연결하기 쉽게 만들었습니다.'],
          ].map(([title, body]) => (
            <article key={title} className="border border-zinc-200 bg-white p-5 shadow-sm">
              <CheckCircle2 className="mb-3 text-emerald-600" size={22} />
              <h2 className="text-lg font-black">{title}</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-zinc-600">{body}</p>
            </article>
          ))}
        </section>

        <div className="chat-grid grid gap-4">
          <ContextPanel context={context} setContext={setContext} />
          <ChatPanel context={context} />
          <AssetPanel context={context} />
        </div>
      </main>
    </div>
  );
}

function WidgetApp() {
  const [context] = React.useState<AgentContext>(() => readContextFromUrl());

  return (
    <div className="h-screen bg-white">
      <ChatPanel context={context} embedded />
    </div>
  );
}

export default function App() {
  const isWidget = window.location.pathname.startsWith('/widget');

  return isWidget ? <WidgetApp /> : <StandaloneApp />;
}


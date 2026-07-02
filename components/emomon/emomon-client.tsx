'use client';

import * as React from 'react';
import {
  ArrowUpRight,
  BarChart3,
  Bot,
  CheckCircle2,
  ClipboardCopy,
  Database,
  FileSearch,
  Loader2,
  LockKeyhole,
  MessageCircle,
  PlugZap,
  Send,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  buildInitialMessage,
  categoryLabel,
  composeFallbackAnswer,
  createMessage,
  formatPlan,
  getStarterQuestions,
  moduleOptions,
  normalizeContext,
  planOptions,
  retrieveLocal,
  type AgentContext,
  type ChatMessage,
  type RagHit,
} from '@/lib/rag/local-retrieval';
import { moduleLabels } from '@/lib/rag/knowledge';

type EmomonMode = 'standalone' | 'widget';
type StandaloneSection = 'widget' | 'streaming' | 'assets' | 'documents';

type ConfigStatus = {
  googleApiKey: boolean;
  upstashVector: boolean;
  generativeModel: string;
  embeddingModel: string;
  namespace: string;
  readyForVectorRag: boolean;
};

type RagCatalogSource = {
  sourceId: string;
  title: string;
  module: string;
  category: string;
  sourceType: string;
  confidence: RagHit['confidence'];
  updatedAt: string;
  tags: string[];
  charLength: number;
  chunkCount: number;
};

type RagCatalogChunk = {
  id: string;
  sourceId?: string;
  title: string;
  module: string;
  category: string;
  sourceType: string;
  chunkIndex: number;
  preview: string;
  charLength: number;
  tokenEstimate: number;
};

type RagCatalogResponse = {
  status: ConfigStatus;
  vectorInfo: {
    connected: boolean;
    namespace: string;
    vectorCount?: number;
    pendingVectorCount?: number;
    dimension?: number;
    similarityFunction?: string;
    namespaceVectorCount?: number;
    reason?: string;
  };
  splitter: {
    library: string;
    strategy: string;
    chunkSize: number;
    chunkOverlap: number;
  };
  summary: {
    sourceCount: number;
    chunkCount: number;
    totalChars: number;
    totalTokenEstimate: number;
  };
  sources: RagCatalogSource[];
  chunks: RagCatalogChunk[];
};

type RagSeedResult = {
  indexed: boolean;
  reason?: string;
  namespace: string;
  sourceCount: number;
  chunkCount: number;
};

function readContextFromWindow(): AgentContext {
  if (typeof window === 'undefined') return normalizeContext(undefined);

  const params = new URLSearchParams(window.location.search);
  const module = params.get('module') || params.get('product') || 'hub';
  const plan = params.get('plan');
  const sourceUrl = params.get('source') || params.get('hub') || document.referrer || undefined;

  return normalizeContext({
    module,
    plan: plan === 'creator' || plan === 'studio' || plan === 'free' ? plan : undefined,
    sourceUrl,
    workspaceName: params.get('workspace') || 'Demo workspace',
  });
}

function ConfidenceBadge({ value }: { value: RagHit['confidence'] }) {
  if (value === 'high') return <Badge className="bg-emerald-50 text-emerald-700">확정</Badge>;
  if (value === 'medium') return <Badge className="bg-amber-50 text-amber-700">검토중</Badge>;

  return <Badge>초안</Badge>;
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
    <article className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[88%] border p-4',
          isUser ? 'border-zinc-950 bg-zinc-950 text-white' : 'border-zinc-200 bg-white text-zinc-950 shadow-sm',
        )}
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

function DashboardOverview({ context, status }: { context: AgentContext; status: ConfigStatus | null }) {
  const docs = retrieveLocal('시장 검증 기획 컨텍스트 플랜 임베드', context, 8);
  const confirmedDocs = docs.filter((hit) => hit.confidence === 'high').length;
  const vectorScore = status?.readyForVectorRag ? 92 : status?.googleApiKey || status?.upstashVector ? 64 : 38;
  const contextScore = Math.min(96, 58 + docs.length * 4 + confirmedDocs * 3);
  const streamScore = status?.googleApiKey ? 88 : 61;
  const ingestionScore = status?.upstashVector ? 84 : 46;
  const scores = [
    { label: '컨텍스트', value: contextScore, tone: 'bg-cyan-600' },
    { label: 'RAG 준비도', value: vectorScore, tone: status?.readyForVectorRag ? 'bg-emerald-600' : 'bg-amber-500' },
    { label: '스트리밍', value: streamScore, tone: 'bg-zinc-900' },
    { label: '인덱싱', value: ingestionScore, tone: status?.upstashVector ? 'bg-emerald-600' : 'bg-zinc-400' },
  ];

  return (
    <section className="mb-4 flex gap-3 overflow-x-auto pb-1">
      <div className="min-w-[10rem] flex-1 border border-zinc-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-black uppercase text-cyan-700">Mode</p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-lg font-black">{status?.readyForVectorRag ? 'Vector RAG' : 'Local Fallback'}</p>
          <span className={cn('h-2.5 w-2.5 shrink-0', status?.readyForVectorRag ? 'bg-emerald-600' : 'bg-amber-500')} />
        </div>
        <p className="mt-1 text-xs font-bold text-zinc-500">{moduleLabels[context.module] ?? context.module}</p>
      </div>
      {scores.map((item) => (
        <div key={item.label} className="min-w-[10rem] flex-1 border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-black text-zinc-500">{item.label}</p>
            <p className="text-xl font-black text-zinc-950">{item.value}</p>
          </div>
          <div className="mt-3 h-2 bg-zinc-200">
            <div className={cn('h-full', item.tone)} style={{ width: `${item.value}%` }} />
          </div>
        </div>
      ))}
    </section>
  );
}

function WidgetStatusPanel({ context, status }: { context: AgentContext; status: ConfigStatus | null }) {
  const snippet = `<script defer src="https://emomon.vercel.app/emomon-embed.js" data-emomon-module="${context.module}" data-emomon-plan="${context.plan}"></script>`;
  const copySnippet = async () => {
    if (!navigator.clipboard) return;
    await navigator.clipboard.writeText(snippet);
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <PlugZap size={18} className="text-cyan-700" />
            <h2 className="text-lg font-black">위젯 상태</h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['현재 제품', moduleLabels[context.module] ?? context.module, true],
              ['플랜', formatPlan(context.plan), true],
              ['Gemini', status?.generativeModel || 'gemini-1.5-flash', Boolean(status?.googleApiKey)],
              ['Vector DB', status?.namespace || 'emomon', Boolean(status?.upstashVector)],
            ].map(([label, detail, active]) => (
              <div key={label as string} className="border border-zinc-200 bg-zinc-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-black text-zinc-500">{label as string}</p>
                  {active ? <CheckCircle2 className="shrink-0 text-emerald-600" size={15} /> : <span className="h-2 w-2 bg-amber-500" />}
                </div>
                <p className="mt-2 truncate text-sm font-black text-zinc-950">{detail as string}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ClipboardCopy size={18} className="text-cyan-700" />
              <h2 className="text-lg font-black">임베드 스니펫</h2>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={copySnippet}>
              복사
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <pre className="max-h-36 overflow-auto border border-zinc-200 bg-zinc-50 p-3 text-xs font-bold leading-5 text-zinc-700">
            <code>{snippet}</code>
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

function RagIndexPanel({ context }: { context: AgentContext }) {
  const [catalog, setCatalog] = React.useState<RagCatalogResponse | null>(null);
  const [selectedSourceId, setSelectedSourceId] = React.useState<string | null>(null);
  const [seedResult, setSeedResult] = React.useState<RagSeedResult | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSeeding, setIsSeeding] = React.useState(false);

  const selectedSource = catalog?.sources.find((source) => source.sourceId === selectedSourceId) || catalog?.sources[0];
  const selectedChunks = selectedSource
    ? catalog?.chunks.filter((chunk) => chunk.sourceId === selectedSource.sourceId).slice(0, 3) || []
    : [];

  const loadCatalog = React.useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/rag/sources');
      const payload = (await response.json()) as RagCatalogResponse;

      setCatalog(payload);
      setSelectedSourceId((current) => current || payload.sources[0]?.sourceId || null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const seedIndex = async () => {
    setIsSeeding(true);
    setSeedResult(null);

    try {
      const response = await fetch('/api/rag/seed', { method: 'POST' });
      const payload = (await response.json()) as RagSeedResult;

      setSeedResult(payload);
      await loadCatalog();
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <Card>
      <CardHeader className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Database size={18} className="text-cyan-700" />
              <h3 className="text-lg font-black">RAG 인덱스</h3>
            </div>
            <p className="mt-2 text-sm font-semibold leading-6 text-zinc-600">
              {catalog
                ? `문서 ${catalog.summary.sourceCount}개 · 청크 ${catalog.summary.chunkCount}개 · Namespace ${catalog.vectorInfo.namespace}`
                : '참조 문서, LangChain 청크, 벡터 저장 상태를 확인합니다.'}
            </p>
          </div>
          <Badge className={catalog?.status.readyForVectorRag ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}>
            {catalog?.status.readyForVectorRag ? 'Vector Ready' : 'Env 대기'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isLoading || !catalog ? (
          <div className="border border-zinc-200 bg-zinc-50 p-4 text-sm font-bold text-zinc-500">인덱스 카탈로그를 불러오는 중입니다.</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 min-[720px]:grid-cols-[0.85fr_1.15fr]">
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-black text-zinc-950">문서 목록</p>
                  <Badge>{catalog.sources.length} docs</Badge>
                </div>
                <div className="max-h-[22rem] overflow-y-auto border border-zinc-200">
                  {catalog.sources.map((source) => (
                    <button
                      key={source.sourceId}
                      type="button"
                      onClick={() => setSelectedSourceId(source.sourceId)}
                      className={cn(
                        'block w-full border-b border-zinc-200 bg-white p-3 text-left last:border-b-0 hover:bg-zinc-50',
                        selectedSource?.sourceId === source.sourceId && 'bg-cyan-50',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-black text-zinc-950">{source.title}</p>
                        <Badge>{source.chunkCount}</Badge>
                      </div>
                      <p className="mt-1 text-xs font-bold text-zinc-500">
                        {moduleLabels[source.module] ?? source.module} · {categoryLabel[source.category as RagHit['category']] ?? source.category}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-black text-zinc-950">청크 미리보기</p>
                  <Badge>{selectedSource?.title || '선택 없음'}</Badge>
                </div>
                <div className="max-h-[22rem] space-y-2 overflow-y-auto">
                  {selectedChunks.map((chunk) => (
                    <div key={chunk.id} className="border border-zinc-200 bg-white p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-black text-cyan-700">{chunk.id}</p>
                        <span className="text-xs font-bold text-zinc-500">{chunk.tokenEstimate} tokens</span>
                      </div>
                      <p className="mt-2 text-xs font-semibold leading-5 text-zinc-600">{chunk.preview}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 min-[720px]:grid-cols-6">
              {[
                ['문서', catalog.summary.sourceCount],
                ['청크', catalog.summary.chunkCount],
                ['토큰 추정', catalog.summary.totalTokenEstimate],
                ['Splitter', catalog.splitter.strategy],
                ['Vector', catalog.vectorInfo.dimension || '미연결'],
                ['저장 벡터', catalog.vectorInfo.namespaceVectorCount ?? '-'],
              ].map(([label, value]) => (
                <div key={label as string} className="border border-zinc-200 bg-zinc-50 p-3">
                  <p className="truncate text-lg font-black">{value as number | string}</p>
                  <p className="text-xs font-bold text-zinc-500">{label as string}</p>
                </div>
              ))}
            </div>

            {catalog.vectorInfo.reason && (
              <div className="border border-zinc-200 bg-zinc-50 p-3 text-xs font-semibold leading-5 text-amber-700">
                {catalog.vectorInfo.reason}
              </div>
            )}

            {seedResult && (
              <div className="border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-sm font-black">{seedResult.indexed ? 'Seed 인덱싱 완료' : 'Seed 청킹 완료'}</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-zinc-600">
                  문서 {seedResult.sourceCount}개 · 청크 {seedResult.chunkCount}개 · {seedResult.namespace}
                </p>
                {seedResult.reason && <p className="mt-2 text-xs font-semibold leading-5 text-amber-700">{seedResult.reason}</p>}
              </div>
            )}

            <Button type="button" onClick={seedIndex} disabled={isSeeding} className="w-full">
              {isSeeding ? <Loader2 className="animate-spin" size={16} /> : <UploadCloud size={16} />}
              기본 문서 인덱싱 실행
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ContextPanel({
  context,
  setContext,
}: {
  context: AgentContext;
  setContext: React.Dispatch<React.SetStateAction<AgentContext>>;
}) {
  return (
    <aside className="border border-zinc-200 bg-white p-3 shadow-sm">
      <div className="grid gap-3 min-[840px]:grid-cols-[10rem_1fr_18rem] min-[840px]:items-end">
        <div className="flex items-center justify-between gap-3 min-[840px]:block">
          <div>
            <p className="text-xs font-black uppercase text-cyan-700">Context</p>
            <h2 className="mt-1 text-base font-black">현재 기준</h2>
          </div>
          <ShieldCheck className="text-zinc-950 min-[840px]:mt-3" size={21} />
        </div>

        <div className="grid gap-3 min-[560px]:grid-cols-2">
          <div>
            <label className="block text-xs font-black uppercase text-zinc-500" htmlFor="module-select">
              서비스
            </label>
            <select
              id="module-select"
              value={context.module}
              onChange={(event) => setContext((prev) => ({ ...prev, module: event.target.value }))}
              className="mt-2 w-full border border-zinc-300 bg-white px-3 py-2 text-sm font-black text-zinc-950"
            >
              {moduleOptions.map((id) => (
                <option key={id} value={id}>
                  {moduleLabels[id] ?? id}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-black uppercase text-zinc-500" htmlFor="plan-select">
              플랜
            </label>
            <select
              id="plan-select"
              value={context.plan}
              onChange={(event) => setContext((prev) => ({ ...prev, plan: event.target.value as AgentContext['plan'] }))}
              className="mt-2 w-full border border-zinc-300 bg-white px-3 py-2 text-sm font-black text-zinc-950"
            >
              {planOptions.map((plan) => (
                <option key={plan} value={plan}>
                  {formatPlan(plan)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="border-t border-zinc-100 pt-3 min-[840px]:border-l min-[840px]:border-t-0 min-[840px]:pl-4 min-[840px]:pt-0">
          <p className="text-xs font-black uppercase text-zinc-400">출처</p>
          <p className="mt-1 line-clamp-2 text-xs font-bold leading-5 text-zinc-600">{context.sourceUrl || '직접 실행된 Emomon 서비스'}</p>
        </div>
      </div>
    </aside>
  );
}

function ChatPanel({ context, embedded = false }: { context: AgentContext; embedded?: boolean }) {
  const [messages, setMessages] = React.useState<ChatMessage[]>(() => [buildInitialMessage(context)]);
  const [input, setInput] = React.useState('');
  const [isStreaming, setIsStreaming] = React.useState(false);
  const starterQuestions = getStarterQuestions(context);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    setMessages([buildInitialMessage(context)]);
  }, [context.module, context.plan]);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submitQuestion = React.useCallback(
    async (value: string) => {
      const question = value.trim();
      if (!question || isStreaming) return;

      const localHits = retrieveLocal(question, context, 4);
      const fallback = composeFallbackAnswer(question, context, localHits);
      const userMessage = createMessage('user', question);
      const assistantId = createMessage('assistant', '').id;
      const nextMessages = [...messages, userMessage];

      setMessages([...nextMessages, { id: assistantId, role: 'assistant', content: '', citations: localHits }]);
      setInput('');
      setIsStreaming(true);

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            messages: nextMessages.map((message) => ({ role: message.role, content: message.content })),
            context,
          }),
        });

        if (!response.ok || !response.body) throw new Error('chat request failed');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let content = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          content += decoder.decode(value, { stream: true });
          setMessages((prev) =>
            prev.map((message) => (message.id === assistantId ? { ...message, content, citations: localHits } : message)),
          );
        }

        if (!content.trim()) throw new Error('empty response');
      } catch {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantId
              ? { ...message, content: fallback.content, citations: fallback.citations, upgradeHint: fallback.upgradeHint }
              : message,
          ),
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [context, isStreaming, messages],
  );

  return (
    <section className={cn('flex min-h-0 flex-col border border-zinc-200 bg-zinc-50 shadow-sm', embedded ? 'h-screen' : 'h-[44rem]')}>
      <header className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-950 text-sm font-black text-white">M</span>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-black">Emomon</h2>
            <p className="truncate text-xs font-bold text-zinc-500">
              {moduleLabels[context.module] ?? context.module} · {formatPlan(context.plan)}
            </p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href="/" target={embedded ? '_blank' : undefined}>
            전체 화면 <ArrowUpRight size={13} />
          </a>
        </Button>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </div>

      <div className="border-t border-zinc-200 bg-white p-4">
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {starterQuestions.map((question) => (
            <Button
              key={question}
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => submitQuestion(question)}
              disabled={isStreaming}
            >
              {question}
            </Button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            submitQuestion(input);
          }}
        >
          <Input
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="검증할 기획, 시장 검색, 결과물 질문을 입력하세요"
            className="min-w-0 flex-1 py-3"
          />
          <Button type="submit" size="icon" aria-label="질문 보내기" disabled={isStreaming}>
            {isStreaming ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
          </Button>
        </form>
      </div>
    </section>
  );
}

function DocumentPanel({ context, status }: { context: AgentContext; status: ConfigStatus | null }) {
  const [title, setTitle] = React.useState('신규 기획 검증 메모');
  const [content, setContent] = React.useState(
    '사용자가 업로드한 레퍼런스 문서, 기획 메모, 시장 조사 내용을 이 영역에 붙여넣으면 Emomon이 청킹 후 벡터 인덱싱 대상으로 보냅니다.',
  );
  const [result, setResult] = React.useState<{ chunks: number; indexed: boolean; reason?: string; namespace?: string } | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);

  const ingest = async () => {
    setIsUploading(true);
    setResult(null);

    try {
      const response = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          module: context.module,
          category: 'workflow',
          sourceType: 'manual',
        }),
      });
      const payload = await response.json();

      if (!response.ok) throw new Error(payload.error || '문서 추가에 실패했습니다.');
      setResult(payload);
    } catch (error) {
      setResult({
        chunks: 0,
        indexed: false,
        reason: error instanceof Error ? error.message : '문서 추가에 실패했습니다.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <UploadCloud size={18} className="text-cyan-700" />
          <h3 className="text-lg font-black">문서 추가</h3>
        </div>
        <p className="mt-2 text-sm font-semibold leading-6 text-zinc-600">
          기획 메모, 레퍼런스 요약, 시장 조사 문장을 붙여 넣어 RAG 문서로 준비합니다.
        </p>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid grid-cols-2 gap-2">
          <Badge className={status?.googleApiKey ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-600'}>
            Gemini {status?.googleApiKey ? '연결됨' : '대기'}
          </Badge>
          <Badge className={status?.upstashVector ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-600'}>
            Upstash {status?.upstashVector ? '연결됨' : '대기'}
          </Badge>
        </div>
        <label className="text-xs font-black uppercase text-zinc-500" htmlFor="document-title">
          제목
        </label>
        <Input id="document-title" value={title} onChange={(event) => setTitle(event.target.value)} className="mt-2" />

        <label className="mt-4 block text-xs font-black uppercase text-zinc-500" htmlFor="document-content">
          내용
        </label>
        <Textarea id="document-content" value={content} onChange={(event) => setContent(event.target.value)} className="mt-2 h-40" />

        {result && (
          <div className="mt-4 border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-sm font-black text-zinc-950">{result.indexed ? '벡터 인덱싱 완료' : '청킹 검증 완료'}</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-zinc-600">
              청크 {result.chunks}개 · 네임스페이스 {result.namespace || 'emomon'}
            </p>
            {result.reason && <p className="mt-2 text-xs font-semibold leading-5 text-amber-700">{result.reason}</p>}
          </div>
        )}

        <Button type="button" onClick={ingest} disabled={isUploading} className="mt-4 w-full">
          {isUploading ? <Loader2 className="animate-spin" size={16} /> : <UploadCloud size={16} />}
          문서 인덱싱
        </Button>
      </CardContent>
    </Card>
  );
}

function StandaloneApp() {
  const [context, setContext] = React.useState<AgentContext>(() => normalizeContext(undefined));
  const [status, setStatus] = React.useState<ConfigStatus | null>(null);
  const [activeSection, setActiveSection] = React.useState<StandaloneSection>('widget');
  const navItems: Array<{ key: StandaloneSection; label: string; icon: typeof PlugZap }> = [
    { key: 'widget', label: '위젯 상태', icon: PlugZap },
    { key: 'streaming', label: '스트리밍', icon: Database },
    { key: 'assets', label: '검증 자산', icon: BarChart3 },
    { key: 'documents', label: '문서 컨텍스트', icon: FileSearch },
  ];

  React.useEffect(() => {
    setContext(readContextFromWindow());
    fetch('/api/status')
      .then((response) => response.json())
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-950">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-950 text-lg font-black text-white">M</span>
            <div>
              <p className="text-sm font-black uppercase text-cyan-700">Context Monitor</p>
              <h1 className="text-3xl font-black tracking-normal">Emomon</h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {navItems.map(({ key, label, icon: Icon }) => {
              const isActive = activeSection === key;

              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setActiveSection(key)}
                  className={cn(
                    'inline-flex items-center gap-2 border px-3 py-2 text-sm font-black transition-colors',
                    isActive
                      ? 'border-zinc-950 bg-zinc-950 text-white'
                      : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-cyan-700 hover:text-cyan-700',
                  )}
                >
                  <Icon size={15} />
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        <DashboardOverview context={context} status={status} />

        <div className="space-y-4">
          <ContextPanel context={context} setContext={setContext} />
          <section className="min-w-0">
            {activeSection === 'widget' && <WidgetStatusPanel context={context} status={status} />}
            {activeSection === 'streaming' && <ChatPanel context={context} />}
            {activeSection === 'assets' && <RagIndexPanel context={context} />}
            {activeSection === 'documents' && <DocumentPanel context={context} status={status} />}
          </section>
        </div>
      </main>
    </div>
  );
}

function WidgetApp() {
  const [context, setContext] = React.useState<AgentContext>(() => normalizeContext(undefined));

  React.useEffect(() => {
    setContext(readContextFromWindow());
  }, []);

  return (
    <div className="h-screen bg-white">
      <ChatPanel context={context} embedded />
    </div>
  );
}

export function EmomonClient({ mode }: { mode: EmomonMode }) {
  return mode === 'widget' ? <WidgetApp /> : <StandaloneApp />;
}

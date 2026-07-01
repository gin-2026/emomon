import { streamText } from 'ai';
import {
  composeFallbackAnswer,
  normalizeContext,
  type AgentContext,
  type ChatRole,
} from '@/lib/rag/local-retrieval';
import { getGenerativeModel, getRagConfigStatus, retrieveRagContext } from '@/lib/rag/vector';

export const runtime = 'edge';

type IncomingMessage = {
  role: ChatRole;
  content: string;
};

function textStreamResponse(text: string, headers?: HeadersInit) {
  const encoder = new TextEncoder();
  const chunks = text.match(/[\s\S]{1,48}/g) || [''];

  return new Response(
    new ReadableStream({
      async start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk));
          await new Promise((resolve) => setTimeout(resolve, 8));
        }
        controller.close();
      },
    }),
    {
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        ...headers,
      },
    },
  );
}

function encodedWarningHeader(warning?: string): Record<string, string> {
  return warning ? { 'x-emomon-warning': encodeURIComponent(warning) } : {};
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        messages?: IncomingMessage[];
        context?: Partial<AgentContext>;
      }
    | null;
  const messages = body?.messages || [];
  const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user')?.content?.trim();
  const context = normalizeContext(body?.context);

  if (!latestUserMessage) {
    return textStreamResponse('질문을 입력해 주세요.', { 'x-emomon-rag-mode': 'local' });
  }

  const retrieval = await retrieveRagContext(latestUserMessage, context, 5);
  const status = getRagConfigStatus();

  if (!status.googleApiKey) {
    const fallback = composeFallbackAnswer(latestUserMessage, context, retrieval.hits);

    return textStreamResponse(fallback.content, {
      'x-emomon-rag-mode': retrieval.mode,
      ...encodedWarningHeader(retrieval.warning || 'missing-google-key'),
    });
  }

  const history = messages
    .slice(-6)
    .map((message) => `${message.role === 'user' ? '사용자' : 'Emomon'}: ${message.content}`)
    .join('\n');
  const system = [
    '당신은 EmoHub 제품군의 공통 RAG 에이전트 Emomon입니다.',
    '답변은 한국어 존댓말로 작성합니다.',
    '아래 근거 문서에 있는 내용과 현재 대화 맥락을 우선 사용하고, 근거가 부족한 부분은 부족하다고 명확히 말합니다.',
    '마케팅 페이지 방문자에게 노출되는 답변처럼 간결하고 실행 가능한 문장으로 씁니다.',
    '',
    `현재 서비스: ${context.module}`,
    `현재 플랜: ${context.plan}`,
    '',
    '검색 근거:',
    retrieval.grounding || '검색 근거 없음',
    '',
    '최근 대화:',
    history || '최근 대화 없음',
  ].join('\n');

  const result = streamText({
    model: getGenerativeModel(),
    system,
    prompt: latestUserMessage,
  });

  return result.toTextStreamResponse({
    headers: {
      'x-emomon-rag-mode': retrieval.mode,
      ...encodedWarningHeader(retrieval.warning),
    },
  });
}

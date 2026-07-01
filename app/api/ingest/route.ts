import { chunkTextDocument } from '@/lib/rag/chunking';
import { normalizeContext } from '@/lib/rag/local-retrieval';
import { upsertDocumentChunks } from '@/lib/rag/vector';

export const runtime = 'nodejs';

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 56);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        title?: string;
        content?: string;
        module?: string;
        category?: string;
        sourceType?: string;
        sourceName?: string;
      }
    | null;

  const title = body?.title?.trim() || 'Untitled document';
  const content = body?.content?.trim();

  if (!content || content.length < 20) {
    return Response.json({ error: '문서 내용은 20자 이상 입력해야 합니다.' }, { status: 400 });
  }

  const context = normalizeContext({ module: body?.module, plan: 'creator' });
  const chunks = await chunkTextDocument({
    idBase: `${slugify(context.module)}-${slugify(title) || Date.now()}`,
    title,
    content,
    module: context.module,
    category: body?.category || 'workflow',
    sourceType: body?.sourceType || 'manual',
    sourceName: body?.sourceName,
  });
  const result = await upsertDocumentChunks(chunks);

  return Response.json({
    title,
    chunks: chunks.length,
    indexed: result.indexed,
    namespace: result.namespace,
    reason: result.reason,
  });
}

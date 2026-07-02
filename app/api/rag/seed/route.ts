import { chunkKnowledgeSources } from '@/lib/rag/chunking';
import { getVectorIndexInfo, upsertDocumentChunks } from '@/lib/rag/vector';

export const runtime = 'nodejs';

export async function POST() {
  const catalog = await chunkKnowledgeSources();
  const result = await upsertDocumentChunks(catalog.chunks);
  const vectorInfo = await getVectorIndexInfo();

  return Response.json({
    indexed: result.indexed,
    reason: result.reason,
    namespace: result.namespace,
    sourceCount: catalog.sources.length,
    chunkCount: catalog.chunks.length,
    vectorInfo,
  });
}

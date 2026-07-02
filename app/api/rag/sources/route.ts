import { chunkKnowledgeSources } from '@/lib/rag/chunking';
import { getRagConfigStatus, getVectorIndexInfo } from '@/lib/rag/vector';

export const runtime = 'nodejs';

export async function GET() {
  const [catalog, vectorInfo] = await Promise.all([chunkKnowledgeSources(), getVectorIndexInfo()]);
  const status = getRagConfigStatus();

  return Response.json({
    status,
    vectorInfo,
    splitter: {
      library: 'LangChain.js',
      strategy: 'RecursiveCharacterTextSplitter',
      chunkSize: 900,
      chunkOverlap: 140,
    },
    summary: {
      sourceCount: catalog.sources.length,
      chunkCount: catalog.chunks.length,
      totalChars: catalog.sources.reduce((sum, source) => sum + source.charLength, 0),
      totalTokenEstimate: catalog.chunks.reduce((sum, chunk) => sum + chunk.tokenEstimate, 0),
    },
    sources: catalog.sources,
    chunks: catalog.chunks,
  });
}

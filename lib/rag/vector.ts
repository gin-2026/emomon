import { google } from '@ai-sdk/google';
import { Index } from '@upstash/vector';
import { embed, embedMany } from 'ai';
import { buildGroundingContext, retrieveLocal, type AgentContext, type RagHit } from './local-retrieval';
import type { ChunkInput } from './chunking';
import type { KnowledgeCategory, KnowledgeDoc } from './knowledge';

const DEFAULT_GENERATIVE_MODEL = 'gemini-1.5-flash';
const DEFAULT_EMBEDDING_MODEL = 'text-embedding-004';
const VECTOR_NAMESPACE = 'emomon';

type VectorMetadata = {
  sourceId?: string;
  title: string;
  content: string;
  module: string;
  category: string;
  sourceType: string;
  chunkIndex: number;
  sourceName?: string;
  updatedAt: string;
};

export type RagConfigStatus = {
  googleApiKey: boolean;
  upstashVector: boolean;
  generativeModel: string;
  embeddingModel: string;
  namespace: string;
  readyForVectorRag: boolean;
};

export type RagRetrievalResult = {
  mode: 'vector' | 'local';
  hits: RagHit[];
  grounding: string;
  warning?: string;
};

export type VectorIndexInfoResult = {
  connected: boolean;
  namespace: string;
  vectorCount?: number;
  pendingVectorCount?: number;
  indexSize?: number;
  dimension?: number;
  similarityFunction?: string;
  namespaceVectorCount?: number;
  reason?: string;
};

export function getRagConfigStatus(): RagConfigStatus {
  const googleApiKey = Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY);
  const upstashVector = Boolean(process.env.UPSTASH_VECTOR_REST_URL && process.env.UPSTASH_VECTOR_REST_TOKEN);

  return {
    googleApiKey,
    upstashVector,
    generativeModel: process.env.GOOGLE_GENERATIVE_MODEL || DEFAULT_GENERATIVE_MODEL,
    embeddingModel: process.env.GOOGLE_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL,
    namespace: process.env.UPSTASH_VECTOR_NAMESPACE || VECTOR_NAMESPACE,
    readyForVectorRag: googleApiKey && upstashVector,
  };
}

function getVectorIndex() {
  if (!process.env.UPSTASH_VECTOR_REST_URL || !process.env.UPSTASH_VECTOR_REST_TOKEN) return null;

  return new Index<VectorMetadata>({
    url: process.env.UPSTASH_VECTOR_REST_URL,
    token: process.env.UPSTASH_VECTOR_REST_TOKEN,
  });
}

export async function getVectorIndexInfo(): Promise<VectorIndexInfoResult> {
  const status = getRagConfigStatus();
  const index = getVectorIndex();

  if (!index) {
    return {
      connected: false,
      namespace: status.namespace,
      reason: 'UPSTASH_VECTOR_REST_URL, UPSTASH_VECTOR_REST_TOKEN이 없어 벡터 인덱스 정보를 조회하지 않습니다.',
    };
  }

  try {
    const info = await index.info();
    const namespaceInfo = info.namespaces?.[status.namespace];

    return {
      connected: true,
      namespace: status.namespace,
      vectorCount: info.vectorCount,
      pendingVectorCount: info.pendingVectorCount,
      indexSize: info.indexSize,
      dimension: info.dimension,
      similarityFunction: String(info.similarityFunction),
      namespaceVectorCount: namespaceInfo?.vectorCount,
    };
  } catch (error) {
    return {
      connected: false,
      namespace: status.namespace,
      reason: error instanceof Error ? error.message : 'Upstash Vector 정보를 조회하지 못했습니다.',
    };
  }
}

function getEmbeddingModel() {
  return google.embedding(process.env.GOOGLE_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL);
}

export function getGenerativeModel() {
  return google(process.env.GOOGLE_GENERATIVE_MODEL || DEFAULT_GENERATIVE_MODEL);
}

function toRagHit(result: { id: string | number; score: number; metadata?: VectorMetadata; data?: string }): RagHit | null {
  const metadata = result.metadata;
  if (!metadata) return null;

  return {
    id: String(result.id),
    title: metadata.title,
    category: (metadata.category || 'workflow') as KnowledgeCategory,
    module: metadata.module || 'emomon',
    sourceType: (metadata.sourceType || 'manual') as KnowledgeDoc['sourceType'],
    updatedAt: metadata.updatedAt,
    confidence: 'medium',
    tags: ['vector', metadata.module, metadata.sourceType].filter(Boolean),
    score: Number(result.score.toFixed(4)),
    snippet: (metadata.content || result.data || '').slice(0, 220),
  };
}

export async function retrieveRagContext(query: string, context: AgentContext, limit = 5): Promise<RagRetrievalResult> {
  const status = getRagConfigStatus();

  if (!status.readyForVectorRag) {
    const hits = retrieveLocal(query, context, limit);
    return {
      mode: 'local',
      hits,
      grounding: buildGroundingContext(hits),
      warning: 'Vector RAG 환경변수가 아직 연결되지 않아 내장 지식 검색으로 응답합니다.',
    };
  }

  try {
    const index = getVectorIndex();
    if (!index) throw new Error('Upstash Vector client is not configured.');

    const { embedding } = await embed({
      model: getEmbeddingModel(),
      value: query,
    });

    const results = await index.query(
      {
        vector: embedding,
        topK: limit,
        includeMetadata: true,
        includeData: true,
      },
      { namespace: status.namespace },
    );
    const vectorHits = results.map(toRagHit).filter((hit): hit is RagHit => Boolean(hit));

    if (vectorHits.length > 0) {
      return {
        mode: 'vector',
        hits: vectorHits,
        grounding: buildGroundingContext(vectorHits),
      };
    }

    const fallbackHits = retrieveLocal(query, context, limit);

    return {
      mode: 'local',
      hits: fallbackHits,
      grounding: buildGroundingContext(fallbackHits),
      warning: '벡터 검색 결과가 비어 있어 내장 지식 검색으로 보강했습니다.',
    };
  } catch (error) {
    const hits = retrieveLocal(query, context, limit);

    return {
      mode: 'local',
      hits,
      grounding: buildGroundingContext(hits),
      warning: error instanceof Error ? error.message : '벡터 검색 중 알 수 없는 오류가 발생했습니다.',
    };
  }
}

export async function upsertDocumentChunks(chunks: ChunkInput[]) {
  const status = getRagConfigStatus();

  if (!status.readyForVectorRag) {
    return {
      indexed: false,
      count: chunks.length,
      namespace: status.namespace,
      reason: 'GOOGLE_GENERATIVE_AI_API_KEY, UPSTASH_VECTOR_REST_URL, UPSTASH_VECTOR_REST_TOKEN 연결 후 벡터 인덱싱이 실행됩니다.',
    };
  }

  const index = getVectorIndex();
  if (!index) throw new Error('Upstash Vector client is not configured.');

  const { embeddings } = await embedMany({
    model: getEmbeddingModel(),
    values: chunks.map((chunk) => chunk.content),
    maxParallelCalls: 4,
  });
  const updatedAt = new Date().toISOString();

  await index.upsert(
    chunks.map((chunk, index) => ({
      id: chunk.id,
      vector: embeddings[index],
      metadata: {
        sourceId: chunk.sourceId,
        title: chunk.title,
        content: chunk.content,
        module: chunk.module,
        category: chunk.category,
        sourceType: chunk.sourceType,
        chunkIndex: chunk.chunkIndex,
        sourceName: chunk.sourceName,
        updatedAt,
      },
    })),
    { namespace: status.namespace },
  );

  return {
    indexed: true,
    count: chunks.length,
    namespace: status.namespace,
    reason: undefined,
  };
}

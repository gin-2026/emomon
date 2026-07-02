import { Document } from '@langchain/core/documents';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { knowledgeDocs, type KnowledgeDoc } from './knowledge';

export type ChunkInput = {
  id: string;
  sourceId?: string;
  title: string;
  content: string;
  module: string;
  category: string;
  sourceType: string;
  chunkIndex: number;
  sourceName?: string;
};

export type RagSourceMetadata = {
  sourceId: string;
  title: string;
  module: string;
  category: string;
  sourceType: string;
  confidence: KnowledgeDoc['confidence'];
  updatedAt: string;
  tags: string[];
};

export type RagSourceChunk = ChunkInput & {
  preview: string;
  charLength: number;
  tokenEstimate: number;
};

function createSplitter() {
  return new RecursiveCharacterTextSplitter({
    chunkSize: 900,
    chunkOverlap: 140,
    separators: ['\n\n', '\n', '. ', '。', ' ', ''],
  });
}

function estimateTokens(text: string) {
  return Math.ceil(text.length / 3.3);
}

function docToContent(doc: KnowledgeDoc) {
  const metrics = doc.metrics?.map((metric) => `- ${metric.label}: ${metric.value} (${metric.note})`).join('\n');

  return [`# ${doc.title}`, doc.body, metrics ? `\n## Metrics\n${metrics}` : ''].filter(Boolean).join('\n\n');
}

function toRagSourceChunk(document: Document<RagSourceMetadata>, chunkIndex: number): RagSourceChunk {
  const metadata = document.metadata;
  const content = document.pageContent.trim();

  return {
    id: `${metadata.sourceId}-chunk-${chunkIndex + 1}`,
    sourceId: metadata.sourceId,
    title: metadata.title,
    content,
    module: metadata.module,
    category: metadata.category,
    sourceType: metadata.sourceType,
    chunkIndex,
    sourceName: metadata.title,
    preview: content.length > 170 ? `${content.slice(0, 170)}...` : content,
    charLength: content.length,
    tokenEstimate: estimateTokens(content),
  };
}

export function buildKnowledgeSourceDocuments() {
  return knowledgeDocs.map(
    (doc) =>
      new Document<RagSourceMetadata>({
        id: doc.id,
        pageContent: docToContent(doc),
        metadata: {
          sourceId: doc.id,
          title: doc.title,
          module: doc.module,
          category: doc.category,
          sourceType: doc.sourceType,
          confidence: doc.confidence,
          updatedAt: doc.updatedAt,
          tags: doc.tags,
        },
      }),
  );
}

export async function chunkKnowledgeSources() {
  const splitter = createSplitter();
  const sourceDocuments = buildKnowledgeSourceDocuments();
  const splitDocuments = await splitter.splitDocuments(sourceDocuments);
  const seenBySource = new Map<string, number>();
  const chunks = splitDocuments.map((document) => {
    const sourceId = document.metadata.sourceId;
    const nextIndex = seenBySource.get(sourceId) || 0;
    seenBySource.set(sourceId, nextIndex + 1);

    return toRagSourceChunk(document as Document<RagSourceMetadata>, nextIndex);
  });
  const chunkCounts = chunks.reduce<Record<string, number>>((counts, chunk) => {
    counts[chunk.sourceId || chunk.title] = (counts[chunk.sourceId || chunk.title] || 0) + 1;
    return counts;
  }, {});

  return {
    sources: sourceDocuments.map((document) => ({
      ...document.metadata,
      charLength: document.pageContent.length,
      chunkCount: chunkCounts[document.metadata.sourceId] || 0,
    })),
    chunks,
  };
}

export async function chunkTextDocument(input: {
  idBase: string;
  title: string;
  content: string;
  module: string;
  category?: string;
  sourceType?: string;
  sourceName?: string;
}) {
  const splitter = createSplitter();
  const chunks = await splitter.splitText(input.content);

  return chunks.map<ChunkInput>((content, index) => ({
    id: `${input.idBase}-${index + 1}`,
    sourceId: input.idBase,
    title: input.title,
    content,
    module: input.module,
    category: input.category || 'workflow',
    sourceType: input.sourceType || 'manual',
    chunkIndex: index,
    sourceName: input.sourceName,
  }));
}

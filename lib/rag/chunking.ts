import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

export type ChunkInput = {
  id: string;
  title: string;
  content: string;
  module: string;
  category: string;
  sourceType: string;
  chunkIndex: number;
  sourceName?: string;
};

export async function chunkTextDocument(input: {
  idBase: string;
  title: string;
  content: string;
  module: string;
  category?: string;
  sourceType?: string;
  sourceName?: string;
}) {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 900,
    chunkOverlap: 140,
    separators: ['\n\n', '\n', '. ', '。', ' ', ''],
  });
  const chunks = await splitter.splitText(input.content);

  return chunks.map<ChunkInput>((content, index) => ({
    id: `${input.idBase}-${index + 1}`,
    title: input.title,
    content,
    module: input.module,
    category: input.category || 'workflow',
    sourceType: input.sourceType || 'manual',
    chunkIndex: index,
    sourceName: input.sourceName,
  }));
}

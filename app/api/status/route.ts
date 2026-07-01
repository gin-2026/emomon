import { getRagConfigStatus } from '@/lib/rag/vector';

export const runtime = 'edge';

export function GET() {
  return Response.json(getRagConfigStatus());
}

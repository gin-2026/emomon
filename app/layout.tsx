import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Emomon | EmoHub Context Agent',
  description: 'EmoHub 제품군의 문서, 실행물, 시장 검증 컨텍스트를 읽는 공통 RAG 에이전트입니다.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

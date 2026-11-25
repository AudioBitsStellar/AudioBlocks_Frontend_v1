import type { Metadata } from 'next';
import LegalDocumentView from '@/components/legal/LegalDocumentView';
import { loadLegalDocument } from '@/lib/legal/document';

const document = loadLegalDocument('terms');

export const metadata: Metadata = {
  title: `${document.title} | AudioBlocks`,
  description: document.description,
  robots: { index: true, follow: true },
  openGraph: {
    title: `${document.title} | AudioBlocks`,
    description: document.description,
    url: '/terms',
    type: 'website',
  },
};

export default function TermsPage() {
  return <LegalDocumentView document={document} />;
}
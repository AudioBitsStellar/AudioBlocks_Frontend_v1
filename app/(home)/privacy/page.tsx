import type { Metadata } from 'next';
import LegalDocumentView from '@/components/legal/LegalDocumentView';
import { loadLegalDocument } from '@/lib/legal/document';

const document = loadLegalDocument('privacy');

export const metadata: Metadata = {
  title: `${document.title} | AudioBlocks`,
  description: document.description,
  robots: { index: true, follow: true },
  openGraph: {
    title: `${document.title} | AudioBlocks`,
    description: document.description,
    url: '/privacy',
    type: 'website',
  },
};

export default function PrivacyPage() {
  return <LegalDocumentView document={document} />;
}

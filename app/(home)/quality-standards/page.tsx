import QualityStandardsCriteria from '@/components/common/quality-standards/QualityStandardsCriteria';
import QualityStandardsHero from '@/components/common/quality-standards/QualityStandardsHero';
import type { Metadata } from 'next';

const TITLE = 'Quality Standards — How AudioBlocks Grades Your Music | AudioBlocks';
const DESCRIPTION =
  'Learn how AudioBlocks uses AI to grade audio quality: clarity, dynamic range, noise floor and distortion, and how remasters are compared against your original upload.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
    images: [{ url: '/logo.png', width: 1200, height: 630, alt: 'AudioBlocks Quality Standards' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/logo.png'],
  },
};

export default function QualityStandardsPage() {
  return (
    <>
      <QualityStandardsHero />
      <QualityStandardsCriteria />
    </>
  );
}

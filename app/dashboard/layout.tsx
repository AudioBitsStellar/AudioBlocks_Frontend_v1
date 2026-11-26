import type { Metadata } from 'next';
import { DashboardClientLayout } from '@/components/common/dashboard/DashboardClientLayout';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardClientLayout>{children}</DashboardClientLayout>;
}

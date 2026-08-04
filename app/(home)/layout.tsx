import { ReactNode } from 'react';
import GoToTopButton from '@/components/common/home/GoToTopButton';
import { PageTransition } from '@/components/ui/PageTransition';
import Footer from '@/layouts/footer';
import Navbar from '@/layouts/navbar';

export default function WebLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <>
      <div>
        <Navbar />
        <main id="main-content">
          <PageTransition>{children}</PageTransition>
        </main>
        <GoToTopButton />
        <Footer />
      </div>
    </>
  );
}

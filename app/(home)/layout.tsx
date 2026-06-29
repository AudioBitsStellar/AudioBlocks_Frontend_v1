import GoToTopButton from '@/components/common/home/GoToTopButton';
import Footer from '@/layouts/footer';
import Navbar from '@/layouts/navbar';
import { ReactNode } from 'react';

export default function WebLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <>
      <div>
        <Navbar />
        <main id="main-content">
          {children}
        </main>
        <GoToTopButton/>
        <Footer/>
      </div>
    </>
  );
}

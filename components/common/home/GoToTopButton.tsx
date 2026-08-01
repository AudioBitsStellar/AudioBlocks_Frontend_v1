'use client';
import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

const GoToTopButton = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      setIsVisible(window.scrollY > 200);
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    isVisible && (
      <button
        aria-label="Scroll to top"
        className="fixed bottom-6 cursor-pointer right-6 z-50 p-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-full shadow-lg hover:scale-110 transition-all duration-300"
        onClick={scrollToTop}
      >
        <ArrowUp size={20} />
      </button>
    )
  );
};

export default GoToTopButton;

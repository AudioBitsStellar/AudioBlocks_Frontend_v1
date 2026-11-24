import { MoveLeft, MoveRight } from 'lucide-react';

interface ArrowProps {
  onClick?: () => void;
  label?: string;
}

export const NextArrow = ({ onClick, label = 'Next slide' }: ArrowProps) => {
  return (
    <button
      aria-label={label}
      className="absolute right-1 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-[#0C090A99] text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      type="button"
      onClick={onClick}
    >
      <MoveRight aria-hidden="true" className="size-5" />
    </button>
  );
};

export const PrevArrow = ({ onClick, label = 'Previous slide' }: ArrowProps) => {
  return (
    <button
      aria-label={label}
      className="absolute left-1 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-[#0C090A99] text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      type="button"
      onClick={onClick}
    >
      <MoveLeft aria-hidden="true" className="size-5" />
    </button>
  );
};

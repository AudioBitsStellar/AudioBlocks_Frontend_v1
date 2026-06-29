import { MoveLeft, MoveRight } from "lucide-react"
import { useCallback } from "react"

interface ArrowProps {
  onClick?: () => void;
  label?: string;
}

export const NextArrow = ({ onClick, label = 'Next slide' }: ArrowProps) => {
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  }, [onClick]);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={label}
      className="absolute right-0 md:right-1 top-1/2 transform -translate-y-1/2 z-10 bg-[#0C090A99] p-3 md:p-6 rounded-full cursor-pointer"
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      <MoveRight className="text-white size-4 md:size-5" />
    </div>
  )
}


export const PrevArrow = ({ onClick, label = 'Previous slide' }: ArrowProps) => {
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  }, [onClick]);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={label}
      className="absolute left-0 md:left-1 top-1/2 transform -translate-y-1/2 z-10 bg-[#0C090A99] p-3 md:p-6 rounded-full cursor-pointer"
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      <MoveLeft className="text-white size-4 md:size-5" />
    </div>
  )
}
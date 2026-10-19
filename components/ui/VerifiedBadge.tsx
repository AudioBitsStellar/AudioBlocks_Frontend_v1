import { Badge } from '@/components/ui/badge';
import { CheckCircle2 } from 'lucide-react';

interface VerifiedBadgeProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function VerifiedBadge({ className, size = 'md' }: VerifiedBadgeProps) {
  const iconSize = size === 'sm' ? 12 : size === 'lg' ? 20 : 16;

  return (
    <Badge
      variant="secondary"
      className={`flex items-center gap-1 bg-green-500/20 text-green-400 border-green-500/50 ${className}`}
    >
      <CheckCircle2 size={iconSize} className="flex-shrink-0" />
      <span className="text-xs">Verified Artist</span>
    </Badge>
  );
}

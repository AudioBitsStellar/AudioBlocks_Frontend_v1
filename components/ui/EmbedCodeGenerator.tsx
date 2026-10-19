'use client';

import { Copy, Code2 } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

export interface EmbedCodeGeneratorProps {
  resourceId: string;
  resourceType: 'song' | 'album';
  title?: string;
  width?: number;
  height?: number;
}

/**
 * Embed code generator for sharing songs and albums as iframes (Issue #587).
 * Generates iframe embed code that can be pasted into blogs, websites, etc.
 */
export function EmbedCodeGenerator({
  resourceId,
  resourceType,
  title = 'AudioBlocks',
  width = 400,
  height = 600,
}: EmbedCodeGeneratorProps) {
  const [copied, setCopied] = useState(false);

  // Get the base URL from environment or window location
  const baseUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL || 'https://audioblocks.com';

  // Generate embed URL pointing to frameable embed page
  const embedUrl = `${baseUrl}/embed/${resourceType}/${resourceId}`;

  // Generate iframe embed code
  const embedCode = `<iframe
  width="${width}"
  height="${height}"
  src="${embedUrl}"
  title="${title}"
  frameborder="0"
  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
  loading="lazy">
</iframe>`;

  const handleCopyEmbed = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      toast.success('Embed code copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy embed code');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <Code2 size={18} className="text-brand" />
        <h3 className="font-semibold text-white">Embed Code</h3>
      </div>

      <p className="text-xs text-on-muted">
        Copy and paste this code to embed on your website or blog.
      </p>

      <div className="bg-surface border border-border-dark rounded-lg p-3">
        <pre className="text-xs text-on-muted overflow-x-auto whitespace-pre-wrap break-words font-mono">
          {embedCode}
        </pre>
      </div>

      <button
        type="button"
        onClick={handleCopyEmbed}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-brand hover:bg-brand/90 text-white rounded-lg transition-colors font-medium text-sm"
      >
        <Copy size={16} />
        {copied ? 'Copied!' : 'Copy Embed Code'}
      </button>
    </div>
  );
}

export default EmbedCodeGenerator;

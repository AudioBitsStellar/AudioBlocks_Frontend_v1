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
 * Embed code generator for sharing songs and albums as iframes (Issue #587, #685).
 * Generates iframe embed code that can be pasted into blogs, websites, etc.
 */
export function EmbedCodeGenerator({
  resourceId,
  resourceType,
  title = 'AudioBlocks',
  width: customWidth,
  height: customHeight,
}: EmbedCodeGeneratorProps) {
  const [size, setSize] = useState<'compact' | 'large'>('compact');
  const [copied, setCopied] = useState(false);

  // Issue #685: Prefer NEXT_PUBLIC_SITE_URL (like app/layout.tsx) so embed code is correct in previews too
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== 'undefined' ? window.location.origin : 'https://audioblocks.com');

  const width = customWidth ?? 400;
  const height = customHeight ?? (size === 'compact' ? 180 : 450);

  // Generate embed URL pointing to frameable embed page
  const embedUrl = `${baseUrl}/embed/${resourceType}/${encodeURIComponent(resourceId)}`;

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
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Code2 size={18} className="text-[#D2045B]" />
          <h3 className="font-semibold text-white text-sm">Embed Code</h3>
        </div>

        {/* Size toggle: Compact or Large */}
        {!customHeight && (
          <div className="flex items-center rounded-lg bg-black/40 p-0.5 border border-white/10 text-xs">
            <button
              type="button"
              className={`px-2.5 py-1 rounded-md transition ${
                size === 'compact' ? 'bg-[#D2045B] text-white font-medium' : 'text-gray-400 hover:text-white'
              }`}
              onClick={() => setSize('compact')}
            >
              Compact
            </button>
            <button
              type="button"
              className={`px-2.5 py-1 rounded-md transition ${
                size === 'large' ? 'bg-[#D2045B] text-white font-medium' : 'text-gray-400 hover:text-white'
              }`}
              onClick={() => setSize('large')}
            >
              Large
            </button>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400">
        Copy and paste this code to embed this track on your website or blog.
      </p>

      <div className="bg-[#121212] border border-white/10 rounded-lg p-3">
        <pre
          data-testid="embed-code-snippet"
          className="text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap break-words font-mono"
        >
          {embedCode}
        </pre>
      </div>

      <button
        type="button"
        aria-label="Copy embed code"
        onClick={handleCopyEmbed}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#D2045B] hover:bg-[#b80348] text-white rounded-lg transition-colors font-medium text-sm"
      >
        <Copy size={16} />
        {copied ? 'Copied to clipboard' : 'Copy Embed Code'}
      </button>
    </div>
  );
}

export default EmbedCodeGenerator;

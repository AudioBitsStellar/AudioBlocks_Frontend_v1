'use client';

import { useState } from 'react';
import Link from 'next/link';
import * as Dialog from '@radix-ui/react-dialog';
import { Copy, Facebook, Share, X, Code2, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import Icon from '@/components/ui/Icon';
import ShareButton from '@/components/ui/ShareButton';
import EmbedCodeGenerator from '@/components/ui/EmbedCodeGenerator';

interface ShareModalProps {
  link: string;
  timestamp?: number;
  artistName: string;
  trackId?: string;
  trackTitle?: string;
}

const ShareModal = ({
  link,
  timestamp,
  artistName,
  trackId,
  trackTitle,
}: ShareModalProps) => {
  const shareUrl =
    timestamp != null && timestamp > 0
      ? `${link}${link.includes('?') ? '&' : '?'}t=${Math.floor(timestamp)}`
      : link;
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'share' | 'embed'>('share');

  // Derive resource id for embedding if not explicitly provided
  const resolvedTrackId =
    trackId ||
    link.split('/song/')[1]?.split('?')[0] ||
    link.split('/vote/')[1]?.split('?')[0] ||
    link.split('/').filter(Boolean).pop() ||
    '1';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 1000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button aria-label="Share">
          <Share className="cursor-pointer" size={15} />
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50" />
        <Dialog.Content className="fixed z-50 top-1/2 left-1/2 w-[90%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-[#1E1E1E] p-6 shadow-2xl focus:outline-none text-white border border-white/10">
          <div className="flex justify-between items-start mb-4">
            <Dialog.Title className="text-lg font-semibold text-[#F4F4F5]">
              Share with your friends!
            </Dialog.Title>
            <Dialog.Close asChild>
              <button aria-label="Close share dialog" className="hover:text-gray-400 transition">
                <X aria-hidden="true" className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          {/* Tab buttons */}
          <div className="flex items-center gap-2 mb-5 p-1 bg-black/30 rounded-lg border border-white/5">
            <button
              type="button"
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-md transition ${
                tab === 'share'
                  ? 'bg-[#D2045B] text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
              onClick={() => setTab('share')}
            >
              <Link2 size={14} />
              Share Link
            </button>
            <button
              type="button"
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-md transition ${
                tab === 'embed'
                  ? 'bg-[#D2045B] text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
              onClick={() => setTab('embed')}
            >
              <Code2 size={14} />
              Embed Player
            </button>
          </div>

          {tab === 'share' ? (
            <>
              <p className="text-sm text-gray-300 mb-3">Share this link via</p>

              <ShareButton
                className="mb-4 min-h-11 w-full rounded-md bg-[#D2045B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#b80348]"
                text={`Listen to ${artistName} on AudioBlocks`}
                title={`Listen to ${artistName} on AudioBlocks`}
                url={shareUrl}
              />

              <div className="flex gap-4 mb-4">
                <Link
                  aria-label="Share on Facebook"
                  className="border border-white/10 p-2 rounded-md hover:bg-white/5 transition"
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <Facebook className="w-5 h-5 hover:scale-110 text-[#1877F2] transition" />
                </Link>
                <Link
                  aria-label="Share on Snapchat"
                  className="border border-white/10 p-2 rounded-md hover:bg-white/5 transition"
                  href="#"
                  target="_blank"
                >
                  <Icon
                    aria-hidden="true"
                    className="w-5 h-5 hover:scale-110 transition text-white"
                    name="snapchat"
                    size="lg"
                  />
                </Link>
                <Link
                  aria-label="Share on X / Twitter"
                  className="border border-white/10 p-2 rounded-md hover:bg-white/5 transition"
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                    `Listen to ${artistName} on AudioBlocks: ${shareUrl}`
                  )}`}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <Icon
                    aria-hidden="true"
                    className="w-5 h-5 hover:scale-110 text-white transition"
                    name="x-brand"
                    size="lg"
                  />
                </Link>
                <Link
                  aria-label="Share on Telegram"
                  className="border border-white/10 p-2 rounded-md hover:bg-white/5 transition"
                  href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}`}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <Icon
                    aria-hidden="true"
                    className="w-5 h-5 hover:scale-110 transition bg-[#1877F2] p-0.5 rounded-full text-white"
                    name="telegram"
                    size="lg"
                  />
                </Link>
              </div>

              <p className="text-sm text-gray-300 mb-2">or copy link</p>

              <div className="flex items-center rounded-md overflow-hidden bg-black/20 border border-white/10 p-1">
                <input
                  readOnly
                  aria-label="Shareable link"
                  className="w-full px-3 py-1.5 text-sm bg-transparent text-white outline-none"
                  value={shareUrl}
                />
                <button
                  aria-label="Copy link"
                  className="bg-[#D2045B] text-white rounded-md px-3.5 py-1.5 text-sm hover:bg-[#b80348] transition flex items-center gap-1.5 shrink-0 font-medium"
                  onClick={handleCopy}
                >
                  <Copy aria-hidden="true" className="w-4 h-4" />
                  {copied ? 'Copied' : 'Copy link'}
                </button>
              </div>
            </>
          ) : (
            <div className="mt-2">
              <EmbedCodeGenerator
                resourceId={resolvedTrackId}
                resourceType="song"
                title={trackTitle || `Listen to ${artistName} on AudioBlocks`}
              />
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default ShareModal;

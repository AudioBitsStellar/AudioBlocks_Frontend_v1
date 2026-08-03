'use client';

import { useState } from 'react';
import Link from 'next/link';
import * as Dialog from '@radix-ui/react-dialog';
import { Copy, Facebook, Share, X } from 'lucide-react';
import { toast } from 'sonner';

const SnapchatGhost = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.479s-.045-.749-.029-1.348c0-.149.015-.284.045-.421.09-.359.225-.689.405-.988.18-.299.404-.57.665-.808.105-.09.209-.165.314-.224.105-.06.209-.105.314-.135.149-.045.3-.075.479-.075.15 0 .3.015.449.06.15.045.299.12.449.224.149.104.299.239.449.404.15.165.299.359.449.584.15.224.299.479.449.749.149.27.284.57.419.899.135.329.27.689.404 1.063.135.374.27.779.404 1.198.135.419.255.869.375 1.348.12.479.225.989.314 1.518.09.53.165 1.078.224 1.623.06.545.09 1.073.09 1.563 0 .09-.003.165-.008.225h-3.924c-.09 0-.164.016-.226.061-.061.044-.091.119-.091.224v3.15c0 .089.03.164.091.224.062.045.136.061.226.061h3.924c.09 0 .164-.016.226-.061.061-.044.091-.119.091-.224v-3.15c.015-.374.015-.779.015-1.198 0-.509-.008-1.003-.03-1.473-.022-.47-.061-.93-.119-1.363-.058-.433-.135-.844-.225-1.229-.09-.386-.195-.734-.314-1.029-.119-.295-.255-.524-.404-.689-.149-.164-.314-.256-.489-.3-.075-.015-.15-.03-.224-.03-.15 0-.27.045-.359.135-.089.09-.134.209-.134.359 0 .074.015.149.044.224.03.074.075.179.135.314.061.135.135.314.225.539.09.225.18.509.285.854.105.345.21.749.315 1.203.104.454.209.954.314 1.493.105.54.209 1.124.314 1.748.105.624.209 1.274.314 1.944.104.669.209 1.349.314 2.028.104.679.209 1.353.314 2.024.105.67.209 1.334.314 1.983.105.649.209 1.293.314 1.923.105.63.209 1.244.314 1.833.104.589.209 1.158.314 1.703.105.545.209 1.074.314 1.583.105.509.209 1.003.314 1.473.105.47.209.93.314 1.363.105.433.209.844.314 1.229.105.385.209.749.314 1.079.105.33.209.629.314.889.105.27.209.509.314.714.105.21.209.39.314.54.105.149.209.27.314.36.105.09.209.15.314.18.105.03.209.045.314.045.104 0 .209-.015.314-.045.105-.03.209-.09.314-.18.105-.09.209-.21.314-.36.105-.15.209-.33.314-.54.105-.21.209-.444.314-.714.105-.27.209-.564.314-.889.105-.33.209-.694.314-1.079.105-.385.209-.794.314-1.229.105-.433.209-.888.314-1.363.105-.47.209-.964.314-1.473.105-.509.209-1.038.314-1.583.105-.545.209-1.114.314-1.703.105-.589.209-1.203.314-1.833.105-.63.209-1.274.314-1.923.105-.649.209-1.303.314-1.983.105-.67.209-1.349.314-2.024.105-.679.209-1.354.314-2.024.105-.67.209-1.334.314-1.983.105-.649.209-1.293.314-1.923.105-.63.209-1.244.314-1.833.104.589.209 1.158.314 1.703.105.545.209 1.074.314 1.583.105.509.209 1.003.314 1.473.105.47.209.93.314 1.363.105.433.209.844.314 1.229.105.385.209.749.314 1.079.105.33.209.629.314.889.105.27.209.509.314.714.105.21.209.39.314.54.105.149.209.27.314.36.105.09.209.15.314.18.105.03.209.045.314.045.104 0 .209-.015.314-.045.105-.03.209-.09.314-.18.105-.09.209-.21.314-.36.105-.15.209-.33.314-.54.105-.21.209-.444.314-.714.105-.27.209-.564.314-.889.105-.33.209-.694.314-1.079.105-.385.209-.794.314-1.229.105-.433.209-.888.314-1.363.105-.47.209-.964.314-1.473.105-.509.209-1.038.314-1.583.105-.545.209-1.114.314-1.703.105-.589.209-1.203.314-1.833.105-.63.209-1.274.314-1.923.105-.649.209-1.303.314-1.983.105-.67.209-1.349.314-2.024.105-.679.209-1.354.314-2.024.105-.67.209-1.334.314-1.983.105-.649.209-1.293.314-1.923.105-.63.209-1.244.314-1.833.104.589.209 1.158.314 1.703.105.545.209 1.074.314 1.583.105.509.209 1.003.314 1.473.105.47.209.93.314 1.363.105.433.209.844.314 1.229.105.385.209.749.314 1.079.105.33.209.629.314.889.105.27.209.509.314.714.105.21.209.39.314.54.105.149.209.27.314.36.105.09.209.15.314.18.105.03.209.045.314.045.104 0 .209-.015.314-.045.105-.03.209-.09.314-.18.105-.09.209-.21.314-.36.105-.15.209-.33.314-.54.105-.21.209-.444.314-.714.105-.27.209-.564.314-.889.105-.33.209-.694.314-1.079.105-.385.209-.794.314-1.229.105-.433.209-.888.314-1.363.105-.47.209-.964.314-1.473.105-.509.209-1.038.314-1.583.105-.545.209-1.114.314-1.703.105-.589.209-1.203.314-1.833.105-.63.209-1.274.314-1.923.105-.649.209-1.303.314-1.983.105-.67.209-1.349.314-2.024.105-.679.209-1.354.314-2.024.105-.67.209-1.334.314-1.983.105-.649.209-1.293.314-1.923.105-.63.209-1.244.314-1.833" />
  </svg>
);

const TelegramPlane = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M21 12.79L9 5l-7 7 7 7 1.73-1.73L14 14.08V21h2v-6.92l5.73 3.23L21 12.79z" />
  </svg>
);

const ShareModal = ({ link }: { link: string }) => {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
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
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed z-50 top-1/2 left-1/2 w-[90%] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg bg-[#1E1E1E] p-6 shadow-xl focus:outline-none text-white">
          <div className="flex justify-between items-start mb-4">
            <Dialog.Title className="text-lg font-semibold text-[#F4F4F5]">
              Share with your friends!
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="hover:text-gray-400 transition">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          <p className="text-sm text-gray-300 mb-3">Share this link via</p>

          <div className="flex gap-4 mb-4">
            <Link
              aria-label="Share on Facebook"
              className="border p-1 rounded-md"
              href={`https://www.facebook.com/sharer/sharer.php?u=${link}`}
              rel="noopener noreferrer"
              target="_blank"
            >
              <Facebook className="w-6 h-6 hover:scale-110 text-[#1877F2] transition" />
            </Link>
            <Link
              aria-label="Share on Snapchat"
              className="border p-1 rounded-md"
              href="#"
              target="_blank"
            >
              <SnapchatGhost className="w-6 h-6 hover:scale-110 transition text-white" />
            </Link>
            <Link
              aria-label="Share on X / Twitter"
              className="border p-1 rounded-md"
              href="#"
              target="_blank"
            >
              <X className="w-6 h-6 hover:scale-110 text-white transition" />
            </Link>
            <Link
              aria-label="Share on Telegram"
              className="border p-1 rounded-md"
              href={`https://t.me/share/url?url=${link}`}
              rel="noopener noreferrer"
              target="_blank"
            >
              <TelegramPlane className="w-6 h-6 hover:scale-110 transition bg-[#1877F2] p-1 rounded-full text-white" />
            </Link>
          </div>

          <p className="text-sm text-gray-300 mb-2">or copy link</p>

          <div className="flex items-center rounded-md overflow-hidden">
            <input
              readOnly
              className="w-full px-3 py-2 text-sm border rounded-md mr-3  bg-transparent text-white outline-none"
              value={link}
            />
            <button
              className="bg-[#D2045B] text-white rounded-md px-4 py-2 text-sm hover:bg-[#b80348] transition flex items-center gap-1"
              onClick={handleCopy}
            >
              <Copy className="w-4 h-4" />
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default ShareModal;

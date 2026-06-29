'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X, Copy } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { FaShare, FaSnapchatGhost, FaTelegramPlane } from "react-icons/fa";
import { FaFacebook } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { toast } from 'sonner';

const ShareModal=({ link }: { link: string })=> {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <FaShare size={15} className='cursor-pointer'/>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed z-50 top-1/2 left-1/2 w-[90%] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg bg-[#1E1E1E] p-6 shadow-xl focus:outline-none text-white">
          <div className="flex justify-between items-start mb-4">
            <Dialog.Title className="text-lg font-semibold text-[#F4F4F5]">Share with your friends!</Dialog.Title>
            <Dialog.Close asChild>
              <button className="hover:text-gray-400 transition">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          <p className="text-sm text-gray-300 mb-3">Share this link via</p>

          <div className="flex gap-4 mb-4">
            <Link href={`https://www.facebook.com/sharer/sharer.php?u=${link}`} target="_blank" className='border p-1 rounded-md' rel="noopener noreferrer">
              <FaFacebook className="w-6 h-6 hover:scale-110 text-[#1877F2] transition"/>
            </Link>
            <Link href="#" className='border p-1 rounded-md' target="_blank" title="Snapchat">
              <FaSnapchatGhost className="w-6 h-6 hover:scale-110 transition text-white" />  
            </Link>
            <Link href="#" className='border p-1 rounded-md'  target="_blank" title="X / Twitter">
              <FaXTwitter className="w-6 h-6 hover:scale-110 text-white transition" />
            </Link>
            <Link href={`https://t.me/share/url?url=${link}`} className='border p-1 rounded-md' target="_blank" rel="noopener noreferrer">
              <FaTelegramPlane className="w-6 h-6 hover:scale-110 transition bg-[#1877F2] p-1 rounded-full text-white" />
            </Link>
          </div>

          <p className="text-sm text-gray-300 mb-2">or copy link</p>

          <div className="flex items-center rounded-md overflow-hidden">
            <input
              value={link}
              readOnly
              className="w-full px-3 py-2 text-sm border rounded-md mr-3  bg-transparent text-white outline-none"
            />
            <button
              onClick={handleCopy}
              className="bg-[#D2045B] text-white rounded-md px-4 py-2 text-sm hover:bg-[#b80348] transition flex items-center gap-1"
            >
              <Copy className="w-4 h-4" />
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default ShareModal;
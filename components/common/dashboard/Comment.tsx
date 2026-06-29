'use client';

import { motion } from 'framer-motion';
import { SendHorizonal, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface CommentPanelProps {
  onClose: () => void;
  trackId: string;
}

const dummyComments = [
  {
    id: 1,
    name: 'Alexia Stephen',
    avatar: '/AFRO.jpg',
    time: '3:52 PM',
    content: 'Amet minim mollit non deserunt ullamco est sit aliqua dolor do amet sint.',
  },
  {
    id: 2,
    name: 'Alexia Stephen',
    avatar: '/tech.jpg',
    time: '3:51 PM',
    content: 'Amet minim mollit non deserunt ullamco est sit aliqua dolor do amet sint.',
  },
  {
    id: 3,
    name: 'Alexia Stephen',
    avatar: '/cat.png',
    time: '3:50 PM',
    content: 'Amet minim mollit non deserunt ullamco est sit aliqua dolor do amet sint.',
  },
];

const Comment = ({ onClose }: CommentPanelProps) => {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleSendComment = () => {
    const trimmed = commentText.trim();
    if (!trimmed) {
      toast.error('Please enter a comment before sending.');
      return;
    }
    toast.success('Comment posted successfully');
    setCommentText('');
  };

  return (
    <motion.div
      initial={{ y: 300, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 300, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      ref={menuRef}
      className="fixed bottom-0 pb-20 right-0 bg-[#1e1e1e] w-80 max-w-sm h-[90vh] p-4 z-50 flex flex-col"
    >
      <div className="flex items-center border-b pb-3 justify-between mb-4">
        <h2 className="text-[#A3A3A3] text-lg font-bold">Comments</h2>
        <button onClick={onClose} className="text-[#A3A3A3] cursor-pointer hover:text-red-400">
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
        {dummyComments.map((comment) => (
          <div key={comment.id} className="flex flex-col border-b pb-2 items-start gap-3">
            <div className="flex items-center gap-2">
              <Image
                src={comment.avatar}
                alt={comment.name}
                width={32}
                height={32}
                className="rounded-full object-cover"
              />
              <h3 className="text-sm font-semibold text-white">{comment.name}</h3>
              <span className="text-xs font-normal text-[#AFB6B2]">{comment.time}</span>
            </div>

            <div>
              <p className="text-xs font-normal text-[#AFB6B2]">{comment.content}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center bg-[#2a2a2a] border rounded-md px-4 py-2 mt-4">
        <textarea
          name="comment"
          placeholder="Type here"
          cols={2}
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          className="w-full resize-none custom-scrollbar bg-transparent text-white outline-none"
          id="comment"
        ></textarea>
        <button onClick={handleSendComment} className="cursor-pointer hover:text-[#D2045B] transition">
          <SendHorizonal />
        </button>
      </div>
    </motion.div>
  );
};

export default Comment;

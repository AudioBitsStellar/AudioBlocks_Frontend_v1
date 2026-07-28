'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Circle, X } from 'lucide-react';
import { useGetProfile } from '@/hooks/useProfile';
import { useNFTCollection } from '@/hooks/useNFTCollection';
import { useLocalStorage } from '@/hooks/useLocalStorage';

const DISMISS_KEY = 'audioblocks_profile_completion_dismissed';

interface ChecklistItem {
  label: string;
  done: boolean;
  href: string;
}

export function ProfileCompletion() {
  const { data: profile, isLoading } = useGetProfile();
  const { nftBalance, isLoading: nftLoading } = useNFTCollection();
  const [dismissed, setDismissed] = useLocalStorage(DISMISS_KEY, false);

  const items = useMemo<ChecklistItem[]>(() => [
    {
      label: 'Upload an avatar',
      done: !!profile?.profileImage,
      href: '/dashboard/profile/edit',
    },
    {
      label: 'Add a bio',
      done: !!profile?.bio,
      href: '/dashboard/profile/edit',
    },
    {
      label: 'Connect at least 1 social link',
      done: !!profile?.twitter,
      href: '/dashboard/profile/edit',
    },
    {
      label: 'Create your first collection',
      done: Number(nftBalance) > 0,
      href: '/dashboard/collection',
    },
  ], [profile, nftBalance]);

  const completedCount = items.filter((i) => i.done).length;
  const totalCount = items.length;
  const percentage = Math.round((completedCount / totalCount) * 100);
  const isComplete = completedCount === totalCount;

  if (isLoading || nftLoading || dismissed || isComplete) return null;

  return (
    <div className="relative mb-6 rounded-lg border border-border-dark bg-surface-elevated p-4">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 text-gray-400 hover:text-white transition"
        aria-label="Dismiss profile completion checklist"
      >
        <X size={16} />
      </button>

      <div className="flex items-center gap-4 mb-3">
        <div className="relative w-12 h-12">
          <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18" cy="18" r="15.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-white/10"
            />
            <circle
              cx="18" cy="18" r="15.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray={`${percentage * 0.97} 97`}
              className="text-brand"
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white">
            {percentage}%
          </span>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Complete your profile</h3>
          <p className="text-xs text-gray-400">
            {completedCount} of {totalCount} tasks done
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.label}>
            <Link
              href={item.href}
              className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition"
            >
              {item.done ? (
                <CheckCircle2 size={16} className="text-green-500 shrink-0" />
              ) : (
                <Circle size={16} className="text-gray-500 shrink-0" />
              )}
              <span className={item.done ? 'line-through text-gray-500' : ''}>
                {item.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

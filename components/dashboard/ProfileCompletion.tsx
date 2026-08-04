'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Circle, X } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useNFTCollection } from '@/hooks/useNFTCollection';
import { useGetProfile } from '@/hooks/useProfile';

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

  const items = useMemo<ChecklistItem[]>(
    () => [
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
    ],
    [profile, nftBalance]
  );

  const completedCount = items.filter((i) => i.done).length;
  const totalCount = items.length;
  const percentage = Math.round((completedCount / totalCount) * 100);
  const isComplete = completedCount === totalCount;

  if (isLoading || nftLoading || dismissed || isComplete) return null;

  return (
    <div className="relative mb-6 rounded-lg border border-border-dark bg-surface-elevated p-4">
      <button
        aria-label="Dismiss profile completion checklist"
        className="absolute top-3 right-3 text-gray-400 hover:text-white transition"
        onClick={() => setDismissed(true)}
      >
        <X size={16} />
      </button>

      <div className="flex items-center gap-4 mb-3">
        <div className="relative w-12 h-12">
          <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
            <circle
              className="text-white/10"
              cx="18"
              cy="18"
              fill="none"
              r="15.5"
              stroke="currentColor"
              strokeWidth="3"
            />
            <circle
              className="text-brand"
              cx="18"
              cy="18"
              fill="none"
              r="15.5"
              stroke="currentColor"
              strokeDasharray={`${percentage * 0.97} 97`}
              strokeLinecap="round"
              strokeWidth="3"
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
              className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition"
              href={item.href}
            >
              {item.done ? (
                <CheckCircle2 className="text-green-500 shrink-0" size={16} />
              ) : (
                <Circle className="text-gray-500 shrink-0" size={16} />
              )}
              <span className={item.done ? 'line-through text-gray-500' : ''}>{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

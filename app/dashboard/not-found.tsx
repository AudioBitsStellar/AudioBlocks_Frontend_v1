'use client';

import Link from 'next/link';
import { ArrowLeft, Home } from 'lucide-react';

export default function DashboardNotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center px-4">
      <div className="relative">
        <div className="absolute -inset-20 bg-[#490D3E80] rounded-full blur-[120px] -z-10" />
        <h1 className="text-6xl font-bold text-white mb-4">404</h1>
        <p className="text-gray-400 mb-8 max-w-md">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="flex items-center gap-4 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-brand hover:opacity-80 text-white px-6 py-3 rounded-full transition"
          >
            <Home size={16} />
            Go to Dashboard
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 bg-[#1E181D] hover:bg-[#885FA8] text-gray-300 px-6 py-3 rounded-full transition"
          >
            <ArrowLeft size={16} />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}

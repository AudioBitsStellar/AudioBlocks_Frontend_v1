'use client';

export function SearchOverlayFooter() {
  return (
    <div className="px-4 py-2 border-t border-gray-800 bg-[#0a0a0a] flex items-center justify-between text-xs text-gray-500">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 rounded bg-gray-800 font-sans">↑</kbd>
          <kbd className="px-1.5 py-0.5 rounded bg-gray-800 font-sans">↓</kbd>
          Navigate
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 rounded bg-gray-800 font-sans">↵</kbd>
          Select
        </span>
      </div>
      <span className="flex items-center gap-1">
        <kbd className="px-1.5 py-0.5 rounded bg-gray-800 font-sans">esc</kbd>
        Close
      </span>
    </div>
  );
}

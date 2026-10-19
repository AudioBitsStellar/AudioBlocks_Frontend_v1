export default function EmbedLoading() {
  return (
    <div className="w-full h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden animate-pulse">
          <div className="w-full aspect-square bg-gray-700" />
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <div className="h-6 bg-gray-700 rounded w-3/4" />
              <div className="h-4 bg-gray-700 rounded w-1/2" />
            </div>
            <div className="h-20 bg-gray-700 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

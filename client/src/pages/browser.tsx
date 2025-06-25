import { useState } from 'react';
import { useSocket } from '@/hooks/use-socket';

export default function Browser() {
  const [url, setUrl] = useState('');
  const { connected, frame, browse, click, type } = useSocket();

  const handleBrowse = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      browse(url);
    }
  };

  const handleViewportClick = (e: React.MouseEvent<HTMLImageElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xNorm = (e.clientX - rect.left) / rect.width;
    const yNorm = (e.clientY - rect.top) / rect.height;
    click(xNorm, yNorm);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      if (target.value.trim()) {
        type(target.value + '\n');
        target.value = '';
      }
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      {/* URL Bar */}
      <div className="p-4 bg-gray-800 border-b border-gray-700">
        <form onSubmit={handleBrowse} className="flex gap-2">
          <input
            type="url"
            placeholder="Enter URL (e.g., https://google.com)"
            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-medium"
          >
            Go
          </button>
        </form>
        <div className="mt-2 text-sm">
          Status: <span className={connected ? 'text-green-400' : 'text-red-400'}>
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Browser Display */}
      <div className="flex-1 flex">
        {/* Main Viewport */}
        <div className="flex-1 p-4">
          <div className="w-full h-full bg-gray-800 rounded border border-gray-700 overflow-hidden">
            {frame ? (
              <img
                src={`data:image/jpeg;base64,${frame}`}
                alt="Browser"
                className="w-full h-full object-contain cursor-crosshair"
                onClick={handleViewportClick}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                {connected ? 'Enter a URL to start browsing' : 'Connecting...'}
              </div>
            )}
          </div>
        </div>

        {/* Text Input Panel */}
        <div className="w-80 p-4 bg-gray-800 border-l border-gray-700">
          <h3 className="text-lg font-semibold mb-3">Type Text</h3>
          <textarea
            rows={6}
            placeholder="Type here and press Enter to send to browser"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={handleKeyDown}
            disabled={!connected}
          />
          <p className="mt-2 text-sm text-gray-400">
            Press Enter to send text to the browser
          </p>
        </div>
      </div>
    </div>
  );
}

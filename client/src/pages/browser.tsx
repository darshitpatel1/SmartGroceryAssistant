import { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/hooks/use-socket';

export default function Browser() {
  const [url, setUrl] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1);
  const { connected, frame, currentUrl, canGoBack, canGoForward, browse, click, doubleClick, focusInput, type, scroll, pressKey, zoom, navigate } = useSocket();
  const viewportRef = useRef<HTMLDivElement>(null);

  const handleBrowse = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      browse(url);
    }
  };

  const handleBack = () => {
    if (canGoBack) {
      navigate('back');
    }
  };

  const handleForward = () => {
    if (canGoForward) {
      navigate('forward');
    }
  };

  const handleRefresh = () => {
    navigate('refresh');
  };

  // Update URL input when current URL changes
  useEffect(() => {
    if (currentUrl && currentUrl !== url) {
      setUrl(currentUrl);
    }
  }, [currentUrl]);

  const handleViewportClick = (e: React.MouseEvent<HTMLImageElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xNorm = (e.clientX - rect.left) / rect.width;
    const yNorm = (e.clientY - rect.top) / rect.height;
    click(xNorm, yNorm);
  };

  const handleViewportDoubleClick = (e: React.MouseEvent<HTMLImageElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xNorm = (e.clientX - rect.left) / rect.width;
    const yNorm = (e.clientY - rect.top) / rect.height;
    doubleClick(xNorm, yNorm);
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

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    scroll(e.deltaY);
  };

  const handleZoomChange = (newZoom: number) => {
    setZoomLevel(newZoom);
    zoom(newZoom);
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (!connected) return;

      // Don't capture keys when user is typing in input fields or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
        return;
      }

      const modifiers: string[] = [];
      if (e.ctrlKey) modifiers.push('ctrl');
      if (e.shiftKey) modifiers.push('shift');
      if (e.altKey) modifiers.push('alt');
      if (e.metaKey) modifiers.push('meta');

      // Common browser shortcuts
      if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        pressKey('F5');
      } else if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        const urlInput = document.querySelector('input[type="url"]') as HTMLInputElement;
        urlInput?.focus();
      } else if (e.key === 'F5') {
        e.preventDefault();
        pressKey('F5');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        pressKey('Escape');
      } else if (e.key === 'Tab') {
        e.preventDefault();
        pressKey('Tab', modifiers);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        pressKey('Enter', modifiers);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        pressKey('Backspace', modifiers);
      } else if (e.key === 'Delete') {
        e.preventDefault();
        pressKey('Delete', modifiers);
      } else if (e.key.length === 1) {
        // Single character keys
        e.preventDefault();
        if (modifiers.length > 0) {
          pressKey(e.key, modifiers);
        } else {
          type(e.key);
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [connected, pressKey, type]);

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      {/* Navigation Bar */}
      <div className="p-4 bg-gray-800 border-b border-gray-700">
        {/* Combined Navigation and URL Bar */}
        <form onSubmit={handleBrowse} className="flex items-center gap-2">
          {/* Navigation Buttons */}
          <button
            type="button"
            onClick={handleBack}
            disabled={!canGoBack || !connected}
            className="p-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 rounded transition-colors"
            title="Go Back"
          >
            ←
          </button>
          <button
            type="button"
            onClick={handleForward}
            disabled={!canGoForward || !connected}
            className="p-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 rounded transition-colors"
            title="Go Forward"
          >
            →
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={!connected}
            className="p-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 rounded transition-colors"
            title="Refresh Page"
          >
            ↻
          </button>
          
          {/* URL Bar */}
          <input
            type="url"
            placeholder="Enter URL (e.g., https://google.com)"
            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={currentUrl || url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button
            type="submit"
            disabled={!connected}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white font-medium transition-colors"
          >
            Go
          </button>
        </form>
        
        {/* Status */}
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
          <div className="w-full h-full bg-gray-800 rounded border border-gray-700 overflow-hidden relative">
            {frame ? (
              <div 
                ref={viewportRef}
                className="w-full h-full"
                onWheel={handleWheel}
                tabIndex={0}
              >
                <img
                  src={`data:image/jpeg;base64,${frame}`}
                  alt="Browser"
                  className="w-full h-full object-contain cursor-pointer"
                  onClick={handleViewportClick}
                  onDoubleClick={handleViewportDoubleClick}
                  draggable={false}
                />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                {connected ? 'Enter a URL to start browsing' : 'Connecting...'}
              </div>
            )}
            
            {/* Zoom Controls */}
            {frame && (
              <div className="absolute top-4 right-4 flex gap-2 bg-black bg-opacity-70 rounded p-2">
                <button
                  onClick={() => handleZoomChange(0.5)}
                  className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs text-white"
                >
                  50%
                </button>
                <button
                  onClick={() => handleZoomChange(0.75)}
                  className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs text-white"
                >
                  75%
                </button>
                <button
                  onClick={() => handleZoomChange(1)}
                  className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs text-white"
                >
                  100%
                </button>
                <button
                  onClick={() => handleZoomChange(1.25)}
                  className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs text-white"
                >
                  125%
                </button>
                <button
                  onClick={() => handleZoomChange(1.5)}
                  className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs text-white"
                >
                  150%
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Controls Panel */}
        <div className="w-80 p-4 bg-gray-800 border-l border-gray-700 flex flex-col gap-4">
          {/* Text Input */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Type Text</h3>
            <textarea
              rows={4}
              placeholder="Type here and press Enter to send to browser"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={handleKeyDown}
              disabled={!connected}
            />
            <div className="mt-2 space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={focusInput}
                  disabled={!connected}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white text-sm font-medium transition-colors"
                  title="Find and focus the best input field on page"
                >
                  Auto Focus
                </button>
                <button
                  onClick={() => {
                    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
                    if (textarea && textarea.value.trim()) {
                      type(textarea.value.trim());
                      textarea.value = '';
                    }
                  }}
                  disabled={!connected}
                  className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white text-sm font-medium transition-colors"
                  title="Send text to browser"
                >
                  Send Text
                </button>
              </div>
              <p className="text-sm text-gray-400">
                Type in box above, then click "Send Text" or press Enter
              </p>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Keyboard Shortcuts</h3>
            <div className="space-y-2 text-sm text-gray-300">
              <div className="flex justify-between">
                <span>Refresh page:</span>
                <span className="text-gray-400">Ctrl+R or F5</span>
              </div>
              <div className="flex justify-between">
                <span>Focus URL bar:</span>
                <span className="text-gray-400">Ctrl+L</span>
              </div>
              <div className="flex justify-between">
                <span>Navigate:</span>
                <span className="text-gray-400">Tab / Shift+Tab</span>
              </div>
              <div className="flex justify-between">
                <span>Submit:</span>
                <span className="text-gray-400">Enter</span>
              </div>
              <div className="flex justify-between">
                <span>Escape:</span>
                <span className="text-gray-400">Esc</span>
              </div>
            </div>
          </div>

          {/* Browser Info */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Browser Info</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Zoom:</span>
                <span className="text-white">{Math.round(zoomLevel * 100)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Viewport:</span>
                <span className="text-white">1280x720</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Status:</span>
                <span className={connected ? 'text-green-400' : 'text-red-400'}>
                  {connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div>
            <h3 className="text-lg font-semibold mb-3">How to Use</h3>
            <div className="text-sm text-gray-400 space-y-2">
              <p>• Enter URL and press Go</p>
              <p>• Click to interact with elements</p>
              <p>• Double-click to select text</p>
              <p>• Use "Focus Input" for forms</p>
              <p>• Scroll with mouse wheel</p>
              <p>• Use keyboard shortcuts</p>
              <p>• Adjust zoom with buttons</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

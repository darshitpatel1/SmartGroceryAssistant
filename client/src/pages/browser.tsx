import { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/hooks/use-socket';
import { Chatbot } from '@/components/chatbot';
import { BrowserViewport } from '@/components/browser-viewport';

export default function Browser() {
  const [url, setUrl] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1);
  const { connected, frame, currentUrl, canGoBack, canGoForward, isLoading, browse, click, doubleClick, focusInput, type, scroll, pressKey, zoom, navigate } = useSocket();
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
    <div className="h-full flex flex-col bg-browser-bg text-browser-text">
      {/* Navigation Bar */}
      <div className="p-4 bg-browser-surface border-b border-browser-border">
        {/* Combined Navigation and URL Bar */}
        <form onSubmit={handleBrowse} className="flex items-center gap-2">
          {/* Navigation Buttons */}
          <button
            type="button"
            onClick={handleBack}
            disabled={!canGoBack || !connected}
            className="p-2 bg-browser-border hover:bg-browser-text-secondary hover:text-browser-bg disabled:bg-browser-bg disabled:text-browser-text-secondary rounded transition-colors"
            title="Go Back"
          >
            ←
          </button>
          <button
            type="button"
            onClick={handleForward}
            disabled={!canGoForward || !connected}
            className="p-2 bg-browser-border hover:bg-browser-text-secondary hover:text-browser-bg disabled:bg-browser-bg disabled:text-browser-text-secondary rounded transition-colors"
            title="Go Forward"
          >
            →
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={!connected}
            className="p-2 bg-browser-border hover:bg-browser-text-secondary hover:text-browser-bg disabled:bg-browser-bg disabled:text-browser-text-secondary rounded transition-colors"
            title="Refresh Page"
          >
            ↻
          </button>
          
          {/* URL Bar */}
          <input
            type="url"
            placeholder="Enter URL (e.g., https://google.com)"
            className="flex-1 px-3 py-2 bg-browser-bg border border-browser-border rounded text-browser-text placeholder-browser-text-secondary focus:outline-none focus:ring-2 focus:ring-browser-primary"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onFocus={(e) => e.target.select()}
          />
          <button
            type="submit"
            disabled={!connected}
            className="px-4 py-2 bg-browser-primary hover:bg-browser-primary/90 disabled:bg-browser-border disabled:cursor-not-allowed rounded text-white font-medium transition-colors"
          >
            Go
          </button>
        </form>
        
        {/* Loading Progress Bar */}
        {isLoading && (
          <div className="mt-2">
            <div className="w-full bg-browser-border rounded-full h-1">
              <div className="bg-browser-primary h-1 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </div>
        )}
        
        {/* Status */}
        <div className="mt-2 text-sm">
          Status: <span className={connected ? 'text-browser-success' : 'text-browser-error'}>
            {connected ? (isLoading ? 'Loading...' : 'Connected') : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Browser Display */}
      <div className="flex-1 flex">
        {/* Main Viewport */}
        <BrowserViewport 
          frame={frame}
          connected={connected}
          onViewportClick={(xNorm, yNorm) => click(xNorm, yNorm)}
          onViewportDoubleClick={(xNorm, yNorm) => doubleClick(xNorm, yNorm)}
          onViewportScroll={(deltaY) => scroll(deltaY)}
        />

        {/* Chatbot Panel */}
        <div className="w-80">
          <Chatbot className="h-full" />
        </div>
      </div>
    </div>
  );
}

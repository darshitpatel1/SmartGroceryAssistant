import { useState } from 'react';
import { useSocket } from '@/hooks/use-socket';
import { BrowserViewport } from '@/components/browser-viewport';
import { ControlsSidebar } from '@/components/controls-sidebar';

export default function Browser() {
  const [url, setUrl] = useState('');
  const { connected, frame, browse, click, type } = useSocket();

  const handleBrowse = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      browse(url);
    }
  };

  const handleViewportClick = (xNorm: number, yNorm: number) => {
    click(xNorm, yNorm);
  };

  const handleTypeText = (text: string) => {
    type(text);
  };

  return (
    <div className="flex flex-col h-screen bg-browser-bg text-browser-text font-sans">
      {/* Header */}
      <header className="bg-browser-surface border-b border-browser-border">
        <div className="flex items-center h-14 px-4 gap-4">
          {/* Window Controls */}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-browser-border rounded transition-colors">
              <i className="fas fa-arrow-left text-browser-text-secondary"></i>
            </button>
            <button className="p-2 hover:bg-browser-border rounded transition-colors">
              <i className="fas fa-arrow-right text-browser-text-secondary"></i>
            </button>
            <button className="p-2 hover:bg-browser-border rounded transition-colors">
              <i className="fas fa-redo text-browser-text-secondary"></i>
            </button>
          </div>

          {/* URL Bar */}
          <div className="flex-1 max-w-2xl">
            <form className="relative" onSubmit={handleBrowse}>
              <input
                type="url"
                placeholder="Enter URL (e.g., https://example.com)"
                className="w-full px-4 py-2 bg-browser-bg border border-browser-border rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-browser-primary focus:border-transparent transition-all"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1 bg-browser-primary hover:bg-blue-700 rounded text-sm font-medium transition-colors"
              >
                Go
              </button>
            </form>
          </div>

          {/* Connection Status */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-browser-success connection-pulse' : 'bg-browser-error'}`}></div>
              <span className={`text-sm font-medium ${connected ? 'text-browser-success' : 'text-browser-error'}`}>
                {connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <button className="p-2 hover:bg-browser-border rounded transition-colors" title="Settings">
              <i className="fas fa-cog text-browser-text-secondary"></i>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        <BrowserViewport
          frame={frame}
          connected={connected}
          onViewportClick={handleViewportClick}
        />
        <ControlsSidebar
          connected={connected}
          onTypeText={handleTypeText}
        />
      </main>

      {/* Status Bar */}
      <footer className="bg-browser-surface border-t border-browser-border px-4 py-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <i className="fas fa-server text-browser-primary"></i>
              <span>Server: {window.location.host}</span>
            </div>
            <div className="flex items-center gap-2">
              <i className="fas fa-desktop text-browser-text-secondary"></i>
              <span>Client: {navigator.userAgent.split(' ').slice(-2).join(' ')}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-browser-text-secondary">
            <span>Status: {connected ? 'Active' : 'Inactive'}</span>
            <span>Mode: Remote Browser</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

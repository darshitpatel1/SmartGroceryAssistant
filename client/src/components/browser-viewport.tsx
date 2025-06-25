import { useState } from 'react';

interface BrowserViewportProps {
  frame: string | null;
  connected: boolean;
  onViewportClick: (xNorm: number, yNorm: number) => void;
}

export function BrowserViewport({ frame, connected, onViewportClick }: BrowserViewportProps) {
  const [scale] = useState('100%');

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xNorm = (e.clientX - rect.left) / rect.width;
    const yNorm = (e.clientY - rect.top) / rect.height;
    onViewportClick(xNorm, yNorm);
  };

  return (
    <div className="flex-1 flex flex-col bg-browser-bg">
      <div className="flex-1 p-4">
        <div className="w-full h-full browser-viewport rounded-lg browser-frame relative overflow-hidden">
          {/* Loading State */}
          {connected && !frame && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-browser-primary mb-4"></div>
                <p className="text-browser-text-secondary">Connecting to browser...</p>
              </div>
            </div>
          )}

          {/* Browser Screenshot Display */}
          {frame && (
            <>
              <img
                src={`data:image/jpeg;base64,${frame}`}
                alt="Browser viewport"
                className="w-full h-full object-contain cursor-crosshair"
                onClick={handleImageClick}
              />
              {/* Viewport Scale Indicator */}
              <div className="absolute top-4 left-4 bg-black bg-opacity-50 rounded px-2 py-1 text-xs font-mono">
                <span>{scale}</span>
              </div>
            </>
          )}

          {/* Placeholder Content */}
          {!connected && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center max-w-md">
                <i className="fas fa-globe text-6xl text-browser-text-secondary mb-4"></i>
                <h3 className="text-xl font-semibold mb-2">Ready to Browse</h3>
                <p className="text-browser-text-secondary">
                  Enter a URL above to start remote browsing. Click anywhere on the page to interact.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Browser Controls Bottom Bar */}
      <div className="border-t border-browser-border bg-browser-surface">
        <div className="flex items-center justify-between p-4">
          {/* Viewport Controls */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Scale:</label>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 bg-browser-border hover:bg-browser-text-secondary hover:text-browser-bg rounded text-sm transition-colors">
                Fit
              </button>
              <button className="px-3 py-1 bg-browser-border hover:bg-browser-text-secondary hover:text-browser-bg rounded text-sm transition-colors">
                100%
              </button>
              <button className="px-3 py-1 bg-browser-border hover:bg-browser-text-secondary hover:text-browser-bg rounded text-sm transition-colors">
                200%
              </button>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="flex items-center gap-6 text-sm text-browser-text-secondary">
            <div>
              <span className="font-medium">Latency:</span>
              <span>45ms</span>
            </div>
            <div>
              <span className="font-medium">FPS:</span>
              <span>24</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

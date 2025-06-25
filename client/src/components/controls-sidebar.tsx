import { useState } from 'react';

interface ControlsSidebarProps {
  connected: boolean;
  onTypeText: (text: string) => void;
}

export function ControlsSidebar({ connected, onTypeText }: ControlsSidebarProps) {
  const [textInput, setTextInput] = useState('');

  const handleTextAreaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (textInput.trim()) {
        onTypeText(textInput + '\n');
        setTextInput('');
      }
    }
  };

  const handleSendText = () => {
    if (textInput.trim()) {
      onTypeText(textInput);
      setTextInput('');
    }
  };

  const handleClearText = () => {
    setTextInput('');
  };

  return (
    <aside className="w-80 bg-browser-surface border-l border-browser-border flex flex-col">
      {/* Text Input Section */}
      <div className="border-b border-browser-border p-4">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <i className="fas fa-keyboard text-browser-primary"></i>
          Text Input
        </h3>

        <div className="space-y-3">
          <textarea
            rows={4}
            placeholder="Type text to send to the browser (Press Enter to send)"
            className="w-full px-3 py-2 bg-browser-bg border border-browser-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-browser-primary focus:border-transparent transition-all text-sm"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={handleTextAreaKeyDown}
            disabled={!connected}
          />

          <div className="flex gap-2">
            <button
              onClick={handleSendText}
              disabled={!connected || !textInput.trim()}
              className="flex-1 px-3 py-2 bg-browser-primary hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded font-medium text-sm transition-colors"
            >
              <i className="fas fa-paper-plane mr-2"></i>
              Send Text
            </button>
            <button
              onClick={handleClearText}
              className="px-3 py-2 bg-browser-border hover:bg-browser-text-secondary hover:text-browser-bg rounded text-sm transition-colors"
              title="Clear"
            >
              <i className="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Browser Information */}
      <div className="border-b border-browser-border p-4">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <i className="fas fa-info-circle text-browser-primary"></i>
          Browser Info
        </h3>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-browser-text-secondary">Viewport:</span>
            <span className="font-mono">1280x720</span>
          </div>
          <div className="flex justify-between">
            <span className="text-browser-text-secondary">User Agent:</span>
            <span className="font-mono text-xs truncate max-w-32" title="Chrome Headless">
              Chrome/119.0
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-browser-text-secondary">Status:</span>
            <span className={`font-mono text-xs ${connected ? 'text-browser-success' : 'text-browser-error'}`}>
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="border-b border-browser-border p-4">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <i className="fas fa-bolt text-browser-primary"></i>
          Quick Actions
        </h3>

        <div className="grid grid-cols-2 gap-2">
          <button className="p-3 bg-browser-bg hover:bg-browser-border rounded-lg text-center transition-colors">
            <i className="fas fa-mouse-pointer block mb-1"></i>
            <span className="text-xs">Click Mode</span>
          </button>
          <button className="p-3 bg-browser-bg hover:bg-browser-border rounded-lg text-center transition-colors">
            <i className="fas fa-scroll block mb-1"></i>
            <span className="text-xs">Scroll</span>
          </button>
          <button className="p-3 bg-browser-bg hover:bg-browser-border rounded-lg text-center transition-colors">
            <i className="fas fa-search block mb-1"></i>
            <span className="text-xs">Find</span>
          </button>
          <button className="p-3 bg-browser-bg hover:bg-browser-border rounded-lg text-center transition-colors">
            <i className="fas fa-download block mb-1"></i>
            <span className="text-xs">Screenshot</span>
          </button>
        </div>
      </div>

      {/* Connection Log */}
      <div className="flex-1 p-4 overflow-hidden">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <i className="fas fa-terminal text-browser-primary"></i>
          Activity Log
        </h3>

        <div className="space-y-2 text-xs font-mono overflow-y-auto max-h-48">
          <div className="flex gap-2">
            <span className="text-browser-text-secondary">{new Date().toLocaleTimeString()}</span>
            <span className={connected ? "text-browser-success" : "text-browser-error"}>
              {connected ? 'Connected to browser' : 'Disconnected from browser'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

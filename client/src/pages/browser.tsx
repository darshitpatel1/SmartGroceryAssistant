import { useState, useEffect, useRef } from 'react';
import { useLocation, useParams } from 'wouter';
import { useSocket } from '@/hooks/use-socket';
import { useSidebar } from '@/hooks/useSidebarToggle';
import { Chatbot } from '@/components/chatbot';
import { BrowserViewport } from '@/components/browser-viewport';
import { WishlistCanvas } from '@/components/wishlist-canvas';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PanelLeftOpen, PanelLeftClose } from 'lucide-react';

export default function Browser() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const groupId = params?.groupId;
  const { isVisible, toggle } = useSidebar();
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

      // Sidebar toggle shortcut
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        toggle();
        return;
      }

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
      } else if (e.key.length === 1 && modifiers.length === 0) {
        // Single character keys without modifiers - only send if not typing in our own inputs
        const isTypingInOurInput = target.closest('.chatbot-input') || target.closest('.url-input');
        if (!isTypingInOurInput) {
          e.preventDefault();
          type(e.key);
        }
      } else if (e.key.length === 1 && modifiers.length > 0) {
        // Character with modifiers
        e.preventDefault();
        pressKey(e.key, modifiers);
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [connected, pressKey, type, toggle]);

  return (
    <div className="h-full flex flex-col bg-black text-white">
      {/* Back button header */}
      <div className="bg-gray-900 border-b border-gray-700 p-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/')}
              className="text-gray-300 hover:text-white hover:bg-gray-800 p-2"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={toggle}
              className="text-gray-300 hover:text-white hover:bg-gray-800 p-2"
              title={isVisible ? "Hide Sidebar (Ctrl+B)" : "Show Sidebar (Ctrl+B)"}
            >
              {isVisible ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeftOpen className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main browser content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Floating sidebar toggle button - shown when sidebar is hidden */}
        {!isVisible && (
          <Button
            variant="ghost"
            size="sm"
            onClick={toggle}
            className="absolute top-4 left-4 z-10 bg-gray-800/90 backdrop-blur-sm border border-gray-600 text-gray-300 hover:text-white hover:bg-gray-700/90 shadow-lg p-2"
            title="Show Sidebar (Ctrl+B)"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </Button>
        )}

        {/* Hidden browser viewport but keep backend connection */}
        <div className="hidden">
          <BrowserViewport 
            frame={frame}
            connected={connected}
            onViewportClick={(xNorm, yNorm) => click(xNorm, yNorm)}
            onViewportDoubleClick={(xNorm, yNorm) => doubleClick(xNorm, yNorm)}
            onViewportScroll={(deltaY) => scroll(deltaY)}
          />
        </div>

        {/* Main chatbot interface - narrower */}
        <main className="w-96 bg-black border-r border-gray-800">
          <Chatbot className="h-full" />
        </main>
        
        {/* Right side grocery canvas - wider */}
        <div className="flex-1">
          <WishlistCanvas groupId={groupId} />
        </div>
      </div>
    </div>
  );
}

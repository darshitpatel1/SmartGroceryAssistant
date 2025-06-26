import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketReturn {
  socket: Socket | null;
  connected: boolean;
  frame: string | null;
  currentUrl: string;
  canGoBack: boolean;
  canGoForward: boolean;
  isLoading: boolean;
  browse: (url: string) => void;
  click: (xNorm: number, yNorm: number) => void;
  doubleClick: (xNorm: number, yNorm: number) => void;
  focusInput: () => void;
  type: (text: string) => void;
  scroll: (deltaY: number) => void;
  pressKey: (key: string, modifiers?: string[]) => void;
  zoom: (level: number) => void;
  navigate: (direction: 'back' | 'forward' | 'refresh') => void;
}

export function useSocket(): UseSocketReturn {
  const [connected, setConnected] = useState(false);
  const [frame, setFrame] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState('');
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Connect to Socket.IO server
    const socket = io('/', {
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to server');
      setConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnected(false);
      setFrame(null);
    });

    socket.on('frame', (data: string) => {
      setFrame(data);
    });

    socket.on('navigation_complete', ({ url, canGoBack: back, canGoForward: forward }: { url: string; canGoBack: boolean; canGoForward: boolean }) => {
      console.log('Navigation complete:', url);
      setCurrentUrl(url);
      setCanGoBack(back);
      setCanGoForward(forward);
    });

    socket.on('url_changed', ({ url, canGoBack: back, canGoForward: forward }: { url: string; canGoBack: boolean; canGoForward: boolean }) => {
      console.log('URL changed:', url);
      setCurrentUrl(url);
      setCanGoBack(back);
      setCanGoForward(forward);
    });

    socket.on('element_clicked', (elementInfo: any) => {
      console.log('Element clicked:', elementInfo);
    });

    socket.on('input_focused', (result: any) => {
      console.log('Input focus result:', result);
    });

    socket.on('double_click_result', (result: any) => {
      console.log('Double click result:', result);
    });

    socket.on('type_result', (result: any) => {
      console.log('Type result:', result);
    });

    socket.on('type_error', (error: any) => {
      console.error('Type error:', error);
    });

    socket.on('click_error', (error: any) => {
      console.error('Click error:', error);
    });

    socket.on('loading', ({ status }: { status: string }) => {
      setIsLoading(status === 'loading' || status === 'starting');
    });

    // Handle URL updates from AI assistant navigation
    socket.on('url_update', ({ url }: { url: string }) => {
      console.log('AI navigation to:', url);
      setCurrentUrl(url);
    });

    socket.on('error', ({ message }: { message: string }) => {
      console.error('Socket error:', message);
      setIsLoading(false);
    });

    // New interaction feedback events
    socket.on('element_interacted', (result: any) => {
      console.log('Element interaction:', result);
    });

    socket.on('text_typed', (result: any) => {
      console.log('Text typed:', result);
    });

    socket.on('scroll_complete', (result: any) => {
      console.log('Scroll complete:', result);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const browse = (url: string) => {
    if (socketRef.current) {
      socketRef.current.emit('browse', { url });
    }
  };

  const click = (xNorm: number, yNorm: number) => {
    if (socketRef.current) {
      socketRef.current.emit('click', { xNorm, yNorm });
    }
  };

  const type = (text: string) => {
    if (socketRef.current) {
      socketRef.current.emit('type', { text });
    }
  };

  const scroll = (deltaY: number) => {
    if (socketRef.current) {
      socketRef.current.emit('scroll', { deltaY });
    }
  };

  const pressKey = (key: string, modifiers?: string[]) => {
    if (socketRef.current) {
      socketRef.current.emit('key', { key, modifiers });
    }
  };

  const zoom = (level: number) => {
    if (socketRef.current) {
      socketRef.current.emit('zoom', { level });
    }
  };

  const navigate = (direction: 'back' | 'forward' | 'refresh') => {
    if (socketRef.current) {
      socketRef.current.emit('navigate', { direction });
    }
  };

  const doubleClick = (xNorm: number, yNorm: number) => {
    if (socketRef.current) {
      socketRef.current.emit('double_click', { xNorm, yNorm });
    }
  };

  const focusInput = () => {
    if (socketRef.current) {
      socketRef.current.emit('focus_input');
    }
  };

  return {
    socket: socketRef.current,
    connected,
    frame,
    currentUrl,
    canGoBack,
    canGoForward,
    isLoading,
    browse,
    click,
    doubleClick,
    focusInput,
    type,
    scroll,
    pressKey,
    zoom,
    navigate,
  };
}

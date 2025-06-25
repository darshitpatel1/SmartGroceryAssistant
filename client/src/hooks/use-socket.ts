import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketReturn {
  socket: Socket | null;
  connected: boolean;
  frame: string | null;
  browse: (url: string) => void;
  click: (xNorm: number, yNorm: number) => void;
  type: (text: string) => void;
  scroll: (deltaY: number) => void;
  pressKey: (key: string, modifiers?: string[]) => void;
  zoom: (level: number) => void;
}

export function useSocket(): UseSocketReturn {
  const [connected, setConnected] = useState(false);
  const [frame, setFrame] = useState<string | null>(null);
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

    socket.on('navigation_complete', ({ url }: { url: string }) => {
      console.log('Navigation complete:', url);
    });

    socket.on('error', ({ message }: { message: string }) => {
      console.error('Socket error:', message);
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

  return {
    socket: socketRef.current,
    connected,
    frame,
    browse,
    click,
    type,
    scroll,
    pressKey,
    zoom,
  };
}

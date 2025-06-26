import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, User, Send, X, ShoppingCart, Search } from 'lucide-react';
import { useSocket } from '@/hooks/use-socket';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  type?: 'info' | 'error' | 'deal' | 'progress';
  data?: any;
}

interface ChatbotProps {
  className?: string;
}

export function Chatbot({ className }: ChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! I\'m your AI shopping assistant. Just tell me your postal code and what items you need, and I\'ll find the best deals for you!',
      sender: 'bot',
      timestamp: new Date(),
      type: 'info'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { socket } = useSocket();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Socket event handlers for AI shopping assistant
  useEffect(() => {
    if (!socket) return;

    const handleAIResponse = (data: { message: string; type?: string; data?: any }) => {
      setIsTyping(false);
      addMessage(data.message, 'bot', data.type, data.data);
    };

    const handlePriceUpdate = (data: { item: string; current: number; total: number }) => {
      setIsTyping(false);
      addMessage(`Searching for ${data.item}...`, 'bot', 'progress', data);
    };

    const handleDealFound = (data: any) => {
      setIsTyping(false);
      addMessage(`Best deal found for ${data.item}!`, 'bot', 'deal', data);
    };

    const handleSearchComplete = (data: { summary: string; nextSteps: string }) => {
      setIsTyping(false);
      addMessage(data.summary, 'bot', 'info');
      if (data.nextSteps) {
        setTimeout(() => addMessage(data.nextSteps, 'bot', 'info'), 1000);
      }
    };

    const handleError = (data: { message: string }) => {
      setIsTyping(false);
      addMessage(data.message, 'bot', 'error');
    };

    socket.on('ai_response', handleAIResponse);
    socket.on('price_update', handlePriceUpdate);
    socket.on('deal_found', handleDealFound);
    socket.on('search_complete', handleSearchComplete);
    socket.on('search_error', handleError);

    return () => {
      socket.off('ai_response', handleAIResponse);
      socket.off('price_update', handlePriceUpdate);
      socket.off('deal_found', handleDealFound);
      socket.off('search_complete', handleSearchComplete);
      socket.off('search_error', handleError);
    };
  }, [socket]);

  const addMessage = (text: string, sender: 'user' | 'bot', type?: string, data?: any) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      sender,
      timestamp: new Date(),
      type: type as any,
      data
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleSend = () => {
    if (!inputValue.trim() || !socket) return;

    // Add user message
    addMessage(inputValue, 'user');
    
    // Send to AI assistant
    setIsTyping(true);
    socket.emit('ai_chat', { message: inputValue });
    
    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderMessage = (message: Message) => {
    const isUser = message.sender === 'user';
    
    if (message.type === 'deal' && message.data) {
      return (
        <Card className="max-w-[80%] bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingCart className="w-4 h-4 text-green-600" />
              <Badge variant="secondary" className="bg-green-100 text-green-800">Best Deal</Badge>
            </div>
            <h4 className="font-semibold text-green-800 dark:text-green-200">{message.data.item}</h4>
            <p className="text-sm text-green-700 dark:text-green-300">
              <span className="font-bold">{message.data.price}</span> at {message.data.cheapestStore}
            </p>
            {message.data.savings && (
              <p className="text-xs text-green-600 dark:text-green-400">{message.data.savings}</p>
            )}
            {message.data.points && (
              <p className="text-xs text-green-600 dark:text-green-400">{message.data.points}</p>
            )}
          </CardContent>
        </Card>
      );
    }

    if (message.type === 'progress' && message.data) {
      return (
        <div className="max-w-[80%] rounded-lg p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-2">
            <Search className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Searching {message.data.current}/{message.data.total}
            </span>
          </div>
          <p className="text-sm text-blue-800 dark:text-blue-200">{message.data.item}</p>
          <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2 mt-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(message.data.current / message.data.total) * 100}%` }}
            />
          </div>
        </div>
      );
    }

    return (
      <div className={`max-w-[80%] rounded-lg p-3 ${
        isUser 
          ? 'bg-browser-primary text-white ml-auto' 
          : message.type === 'error'
          ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
          : message.type === 'info'
          ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
          : 'bg-browser-border text-browser-text'
      }`}>
        <div className="flex items-start gap-2">
          {!isUser && <Bot className="w-4 h-4 text-browser-primary mt-0.5 flex-shrink-0" />}
          {isUser && <User className="w-4 h-4 text-white/80 mt-0.5 flex-shrink-0" />}
          <div className="flex-1">
            <p className="text-sm break-words">{message.text}</p>
            <span className="text-xs opacity-70 mt-1 block">
              {message.timestamp.toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>
    );
  };

  if (isMinimized) {
    return (
      <Button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 right-4 bg-browser-primary hover:bg-browser-primary/90 text-white shadow-lg z-50"
      >
        <Bot className="w-4 h-4 mr-2" />
        AI Assistant
      </Button>
    );
  }

  return (
    <div className={`bg-browser-surface border-l border-browser-border flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-browser-border flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-browser-primary" />
            <h3 className="font-semibold text-browser-text">AI Shopping Assistant</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(true)}
            className="h-8 w-8 p-0 hover:bg-browser-border"
          >
            <X className="w-4 h-4 text-browser-text-secondary" />
          </Button>
        </div>
        <p className="text-xs text-browser-text-secondary mt-1">
          Find the best deals with AI price comparison
        </p>
      </div>

      {/* Messages - Fixed height with scroll */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {renderMessage(message)}
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg p-3 bg-browser-border text-browser-text">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-browser-primary" />
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-browser-text-secondary rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-browser-text-secondary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-browser-text-secondary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Input - Fixed at bottom */}
      <div className="p-4 border-t border-browser-border flex-shrink-0">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about prices, stores, or deals..."
            className="flex-1 bg-browser-bg border-browser-border focus:ring-browser-primary text-sm"
          />
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            size="sm"
            className="bg-browser-primary hover:bg-browser-primary/90 text-white"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
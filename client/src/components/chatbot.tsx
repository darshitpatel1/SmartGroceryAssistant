import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, User, Send, X, ShoppingCart, Search, MapPin, Zap, Loader2, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { useSocket } from '@/hooks/use-socket';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  type?: 'info' | 'error' | 'deal' | 'progress' | 'analysis' | 'success';
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
        <Card className="max-w-[85%] bg-gradient-to-r from-green-900/50 to-emerald-900/50 border border-green-700/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-green-600 rounded-lg">
                  <ShoppingCart className="w-4 h-4 text-white" />
                </div>
                <Badge variant="secondary" className="bg-green-800/70 text-green-200 border-green-600">
                  Deal {message.data.dealIndex || ''}/{message.data.totalDeals || ''}
                </Badge>
              </div>
              <Badge variant="outline" className="text-xs border-gray-600 text-gray-300 bg-black/30">
                <MapPin className="w-3 h-3 mr-1" />
                M5V
              </Badge>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-bold text-white text-lg">
                {message.data.brand && `${message.data.brand} `}{message.data.item}
              </h4>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-green-300">{message.data.price}</span>
                  {message.data.packageSize && (
                    <span className="text-sm text-gray-400">({message.data.packageSize})</span>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-white">{message.data.store}</div>
                </div>
              </div>
              
              <div className="flex gap-4 pt-2">
                {message.data.savings && (
                  <div className="flex items-center gap-1 text-sm text-orange-300 bg-orange-900/30 px-2 py-1 rounded-md">
                    <Zap className="w-3 h-3" />
                    {message.data.savings}
                  </div>
                )}
                {message.data.points && (
                  <div className="flex items-center gap-1 text-sm text-blue-300 bg-blue-900/30 px-2 py-1 rounded-md">
                    <Bot className="w-3 h-3" />
                    {message.data.points}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (message.type === 'progress' && message.data) {
      return (
        <div className="max-w-[85%] rounded-xl p-4 bg-gradient-to-r from-blue-900/50 to-purple-900/50 border border-blue-700/50 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-1.5 bg-blue-600 rounded-lg animate-pulse">
              <Search className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-medium text-blue-200">
              Searching {message.data.current}/{message.data.total}
            </span>
            <Badge variant="outline" className="text-xs border-gray-600 text-gray-300 bg-black/30">
              <MapPin className="w-3 h-3 mr-1" />
              M5V
            </Badge>
          </div>
          <p className="text-sm text-white font-medium">{message.data.item}</p>
          <div className="w-full bg-gray-800 rounded-full h-2 mt-3">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500 animate-pulse"
              style={{ width: `${(message.data.current / message.data.total) * 100}%` }}
            />
          </div>
        </div>
      );
    }

    return (
      <div className={`max-w-[85%] rounded-xl p-4 ${
        isUser 
          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white ml-auto' 
          : message.type === 'error'
          ? 'bg-gradient-to-r from-red-900/50 to-red-800/50 text-red-200 border border-red-700/50'
          : message.type === 'info'
          ? 'bg-gradient-to-r from-blue-900/50 to-blue-800/50 text-blue-200 border border-blue-700/50'
          : message.type === 'analysis'
          ? 'bg-gradient-to-r from-purple-900/50 to-purple-800/50 text-purple-200 border border-purple-700/50'
          : 'bg-gray-900 text-white border border-gray-700'
      }`}>
        <div className="flex items-start gap-3">
          {!isUser && (
            <div className={`p-1.5 rounded-lg ${
              message.type === 'error' ? 'bg-red-600' :
              message.type === 'info' ? 'bg-blue-600' :
              message.type === 'analysis' ? 'bg-purple-600' :
              'bg-gradient-to-r from-blue-600 to-purple-600'
            }`}>
              {message.type === 'error' && <AlertCircle className="w-3 h-3 text-white" />}
              {message.type === 'info' && <Info className="w-3 h-3 text-white" />}
              {message.type === 'analysis' && <Search className="w-3 h-3 text-white" />}
              {!message.type && <Bot className="w-3 h-3 text-white" />}
            </div>
          )}
          {isUser && (
            <div className="p-1.5 bg-white/20 rounded-lg">
              <User className="w-3 h-3 text-white" />
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium opacity-70">
                {isUser ? 'You' : 'AI Assistant'}
              </span>
              <span className="text-xs opacity-50">
                {message.timestamp.toLocaleTimeString()}
              </span>
            </div>
            <p className="text-sm break-words leading-relaxed">{message.text}</p>
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
    <div className={`bg-black border-r border-gray-800 flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white">Smart Shopping Assistant</h3>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>Hey! I'm here to help you find the best deals</span>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(true)}
            className="h-8 w-8 p-0 hover:bg-gray-800 text-gray-400"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages - Fixed height with internal scroll */}
      <div className="flex-1 overflow-hidden bg-black">
        <div className="h-full overflow-y-auto p-4 space-y-4" style={{ maxHeight: 'calc(100vh - 200px)' }}>
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
      </div>

      {/* Input - Fixed at bottom */}
      <div className="p-4 border-t border-gray-800 flex-shrink-0 bg-black">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your postal code + grocery items..."
              className="flex-1 bg-gray-900 border-gray-700 focus:ring-blue-500 text-white placeholder-gray-400 text-sm pr-10"
            />
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            size="sm"
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Quick action buttons */}
        <div className="flex gap-2 mt-3">
          <Button
            onClick={() => setInputValue("M5V 3A1 ")}
            variant="outline"
            size="sm"
            className="text-xs bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
          >
            <MapPin className="w-3 h-3 mr-1" />
            Postal Code
          </Button>
          <Button
            onClick={() => {
              // Get selected items from localStorage
              const savedGroceryList = localStorage.getItem('groceryList');
              const savedPostalCode = localStorage.getItem('postalCode') || 'M5V 3A1';
              
              if (savedGroceryList) {
                const groceryList = JSON.parse(savedGroceryList);
                const selectedItems = groceryList
                  .filter((item: any) => item.selected)
                  .map((item: any) => item.name)
                  .join(' ');
                
                if (selectedItems) {
                  setInputValue(`${savedPostalCode} ${selectedItems}`);
                } else {
                  setInputValue(`${savedPostalCode} `);
                }
              } else {
                setInputValue(`${savedPostalCode} `);
              }
            }}
            variant="outline"
            size="sm"
            className="text-xs bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
          >
            <ShoppingCart className="w-3 h-3 mr-1" />
            Quick List
          </Button>
        </div>
      </div>
    </div>
  );
}
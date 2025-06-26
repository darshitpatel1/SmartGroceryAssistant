import { useState, useRef, useEffect } from "react";
import { Send, MessageCircle, X, Bot, User, Type, ShoppingCart, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSocket } from "@/hooks/use-socket";

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  type?: 'text' | 'info' | 'error' | 'analysis' | 'deal' | 'progress' | 'complete';
  data?: any;
}

interface PriceAnalysis {
  item: string;
  cheapestStore: string;
  price: string;
  savings?: string;
  points?: string;
  confidence: number;
}

interface ChatbotProps {
  className?: string;
}

export function Chatbot({ className }: ChatbotProps) {
  const { type, focusInput, connected, socket } = useSocket();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm your AI shopping assistant. I can help you find the best deals by comparing prices across different stores. Just tell me your postal code and what items you want to buy!",
      sender: 'bot',
      timestamp: new Date(),
      type: 'text'
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isMinimized, setIsMinimized] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typeMode, setTypeMode] = useState(false);
  const [shoppingMode, setShoppingMode] = useState(true);
  const [postalCode, setPostalCode] = useState("");
  const [shoppingList, setShoppingList] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen for AI responses
  useEffect(() => {
    if (!socket) return;

    const handleAIResponse = (data: { response: string; type: string; data?: any }) => {
      const newMessage: Message = {
        id: Date.now().toString(),
        text: data.response,
        sender: 'bot',
        timestamp: new Date(),
        type: data.type as any,
        data: data.data
      };
      
      setMessages(prev => [...prev, newMessage]);
      setIsTyping(false);
    };

    socket.on("ai_response", handleAIResponse);

    return () => {
      socket.off("ai_response", handleAIResponse);
    };
  }, [socket]);

  const simulateBotResponse = (userMessage: string) => {
    setIsTyping(true);
    
    setTimeout(() => {
      const botResponses = [
        "I can help you with that! Try clicking on the element you want to interact with.",
        "For better browsing, you can use the zoom controls or scroll with your mouse wheel.",
        "If you need to fill out a form, click 'Focus Input' first, then type your text.",
        "I'm here to assist with your browsing experience. What would you like to do next?",
        "That's a great question! Let me help you navigate this website more effectively.",
      ];
      
      const randomResponse = botResponses[Math.floor(Math.random() * botResponses.length)];
      
      const botMessage: Message = {
        id: Date.now().toString() + '_bot',
        text: randomResponse,
        sender: 'bot',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 1000 + Math.random() * 2000);
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;

    if (typeMode) {
      // Send text directly to browser
      type(inputValue);
      const userMessage: Message = {
        id: Date.now().toString(),
        text: `Typed: "${inputValue}"`,
        sender: 'user',
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, userMessage]);
      setInputValue("");
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    
    // Send to AI assistant if in shopping mode
    if (shoppingMode && socket) {
      setIsTyping(true);
      socket.emit("ai_chat", { message: inputValue, type: 'message' });
    } else {
      // Simulate bot response for regular mode
      simulateBotResponse(inputValue);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStartShopping = () => {
    if (!socket) return;
    setIsTyping(true);
    socket.emit("ai_chat", { message: "Start shopping session", type: 'start' });
  };

  const handlePriceSearch = () => {
    if (!socket || !postalCode.trim()) return;
    const items = shoppingList.split('\n').filter(item => item.trim());
    if (items.length === 0) return;

    setIsTyping(true);
    if (items.length === 1) {
      socket.emit("start_price_search", { item: items[0].trim(), postalCode: postalCode.trim() });
    } else {
      socket.emit("process_shopping_list", { items, postalCode: postalCode.trim() });
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
      <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
        <Button
          onClick={() => setIsMinimized(false)}
          className="h-12 w-12 rounded-full bg-browser-primary hover:bg-browser-primary/90 shadow-lg"
        >
          <MessageCircle className="w-6 h-6 text-white" />
        </Button>
      </div>
    );
  }

  return (
    <div className={`bg-browser-surface border-l border-browser-border flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-browser-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-browser-primary" />
            <h3 className="font-semibold text-browser-text">AI Shopping Assistant</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShoppingMode(!shoppingMode)}
              className={`h-8 w-8 p-0 hover:bg-browser-border ${shoppingMode ? 'bg-browser-primary text-white' : ''}`}
              title={shoppingMode ? "Browser mode" : "Shopping mode"}
            >
              <ShoppingCart className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTypeMode(!typeMode)}
              className={`h-8 w-8 p-0 hover:bg-browser-border ${typeMode ? 'bg-browser-primary text-white' : ''}`}
              title={typeMode ? "Chat mode" : "Type mode"}
            >
              <Type className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(true)}
              className="h-8 w-8 p-0 hover:bg-browser-border"
            >
              <X className="w-4 h-4 text-browser-text-secondary" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-browser-text-secondary mt-1">
          {typeMode ? "Type mode: Text will be sent directly to browser" : 
           shoppingMode ? "Shopping mode: Find the best deals with AI price comparison" : 
           "Chat mode: Ask me anything about browsing!"}
        </p>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
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

      {/* Controls */}
      <div className="p-4 border-t border-browser-border space-y-3">
        {/* Mode Toggles */}
        <div className="flex gap-2">
          <Button
            onClick={() => setShoppingMode(!shoppingMode)}
            size="sm"
            variant={shoppingMode ? "default" : "outline"}
            className="flex-1 text-xs"
          >
            <ShoppingCart className="w-3 h-3 mr-1" />
            {shoppingMode ? "Shopping Mode" : "Chat Mode"}
          </Button>
          <Button
            onClick={() => setTypeMode(!typeMode)}
            size="sm"
            variant={typeMode ? "default" : "outline"}
            className="flex-1 text-xs"
          >
            <Type className="w-3 h-3 mr-1" />
            {typeMode ? "Type Mode" : "Browser"}
          </Button>
        </div>

        {/* Shopping Assistant Interface */}
        {shoppingMode && (
          <div className="space-y-3 p-3 bg-browser-bg rounded-lg border border-browser-border">
            <div className="text-xs font-semibold text-browser-text flex items-center gap-2">
              <MapPin className="w-3 h-3" />
              Quick Setup
            </div>
            
            {/* Postal Code Input */}
            <div>
              <Input
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="Enter postal code (e.g., M4P2B3)"
                className="text-xs bg-browser-surface border-browser-border"
              />
            </div>

            {/* Shopping List Input */}
            <div>
              <textarea
                value={shoppingList}
                onChange={(e) => setShoppingList(e.target.value)}
                placeholder="Enter items (one per line):&#10;milk&#10;bread&#10;eggs"
                rows={3}
                className="w-full text-xs p-2 bg-browser-surface border border-browser-border rounded-md resize-none focus:ring-1 focus:ring-browser-primary"
              />
            </div>

            {/* Quick Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={handlePriceSearch}
                disabled={!postalCode.trim() || !shoppingList.trim()}
                size="sm"
                className="flex-1 text-xs bg-browser-primary hover:bg-browser-primary/90"
              >
                <Search className="w-3 h-3 mr-1" />
                Find Best Prices
              </Button>
              <Button
                onClick={handleStartShopping}
                size="sm"
                variant="outline"
                className="text-xs"
              >
                <Bot className="w-3 h-3 mr-1" />
                AI Help
              </Button>
            </div>
          </div>
        )}
        
        {/* Regular Chat Input */}
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              typeMode ? "Type text to browser..." : 
              shoppingMode ? "Ask about prices, stores, or deals..." : 
              "Chat message..."
            }
            className="chatbot-input flex-1 bg-browser-bg border-browser-border focus:ring-browser-primary text-sm"
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
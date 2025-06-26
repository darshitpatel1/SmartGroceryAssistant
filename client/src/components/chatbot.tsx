import { useState, useRef, useEffect } from "react";
import { Send, MessageCircle, X, Bot, User, Type, Focus, MousePointer, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSocket } from "@/hooks/use-socket";

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface ChatbotProps {
  className?: string;
}

export function Chatbot({ className }: ChatbotProps) {
  const { type, focusInput, connected } = useSocket();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm your browser assistant. I can help you navigate websites, answer questions, or provide assistance while browsing.",
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isMinimized, setIsMinimized] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typeMode, setTypeMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage]);
      setInputValue("");
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    
    // Simulate bot response
    simulateBotResponse(inputValue);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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
            <Bot className="w-5 h-5 text-browser-primary" />
            <h3 className="font-semibold text-browser-text">Browser Assistant</h3>
          </div>
          <div className="flex items-center gap-2">
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
          {typeMode ? "Type mode: Text will be sent directly to browser" : "Chat mode: Ask me anything about browsing!"}
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
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.sender === 'user'
                    ? 'bg-browser-primary text-white'
                    : 'bg-browser-border text-browser-text'
                }`}
              >
                <div className="flex items-start gap-2">
                  {message.sender === 'bot' && (
                    <Bot className="w-4 h-4 mt-0.5 flex-shrink-0 text-browser-primary" />
                  )}
                  {message.sender === 'user' && (
                    <User className="w-4 h-4 mt-0.5 flex-shrink-0 text-white/80" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm">{message.text}</p>
                    <p className={`text-xs mt-1 ${
                      message.sender === 'user' ? 'text-white/70' : 'text-browser-text-secondary'
                    }`}>
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
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
        {/* Browser Interaction Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={() => focusInput()}
            disabled={!connected}
            size="sm"
            variant="outline"
            className="flex-1 text-xs"
          >
            <Focus className="w-3 h-3 mr-1" />
            Focus Input
          </Button>
          <Button
            onClick={() => setTypeMode(!typeMode)}
            size="sm"
            variant={typeMode ? "default" : "outline"}
            className="flex-1 text-xs"
          >
            <Type className="w-3 h-3 mr-1" />
            Type Mode
          </Button>
        </div>
        
        {/* Input */}
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={typeMode ? "Type text to browser..." : "Chat message..."}
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
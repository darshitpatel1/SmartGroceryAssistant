import { createContext, useContext, useState, ReactNode } from 'react';

interface SidebarContextType {
  isVisible: boolean;
  toggle: () => void;
  hide: () => void;
  show: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

interface SidebarProviderProps {
  children: ReactNode;
}

export function SidebarProvider({ children }: SidebarProviderProps) {
  const [isVisible, setIsVisible] = useState(true);

  const toggle = () => setIsVisible(prev => !prev);
  const hide = () => setIsVisible(false);
  const show = () => setIsVisible(true);

  return (
    <SidebarContext.Provider value={{ isVisible, toggle, hide, show }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}

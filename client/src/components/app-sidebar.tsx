import { Link, useLocation } from "wouter";
import { Home, Globe, Settings, Menu } from "lucide-react";
import { useState } from "react";

interface AppSidebarProps {
  className?: string;
}

export function AppSidebar({ className }: AppSidebarProps) {
  const [location] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    {
      href: "/",
      icon: Home,
      label: "Home",
      active: location === "/"
    },
    {
      href: "/browser",
      icon: Globe,
      label: "Browser",
      active: location === "/browser"
    },
    {
      href: "/settings",
      icon: Settings,
      label: "Settings",
      active: location === "/settings"
    }
  ];

  return (
    <div className={`bg-browser-surface border-r border-browser-border flex flex-col ${isCollapsed ? 'w-16' : 'w-64'} transition-all duration-300 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-browser-border">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <h2 className="text-lg font-semibold text-browser-text">Remote Browser</h2>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 hover:bg-browser-border rounded-lg transition-colors"
          >
            <Menu className="w-4 h-4 text-browser-text-secondary" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link href={item.href}>
                  <div
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                      item.active
                        ? 'bg-browser-primary text-white'
                        : 'text-browser-text-secondary hover:bg-browser-border hover:text-browser-text'
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {!isCollapsed && (
                      <span className="font-medium">{item.label}</span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-browser-border">
        <div className={`flex ${isCollapsed ? 'justify-center' : 'items-center gap-3'}`}>
          <div className="w-8 h-8 bg-browser-primary rounded-full flex items-center justify-center">
            <Globe className="w-4 h-4 text-white" />
          </div>
          {!isCollapsed && (
            <div className="flex-1">
              <p className="text-sm font-medium text-browser-text">Browser App</p>
              <p className="text-xs text-browser-text-secondary">v1.0.0</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
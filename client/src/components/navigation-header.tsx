import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LayoutDashboard, Search } from "lucide-react";

export function NavigationHeader() {
  const [location, setLocation] = useLocation();
  
  const isBrowserPage = location === "/browser" || location.includes("/browser");

  return (
    <header className="bg-gray-900 border-b border-gray-700 px-6 py-3 flex justify-between items-center">
      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          <Button
            variant={location === "/" ? "default" : "ghost"}
            size="sm"
            onClick={() => setLocation("/")}
            className={`flex items-center gap-2 ${
              location === "/" 
                ? "bg-blue-600 text-white hover:bg-blue-700" 
                : "text-gray-300 hover:text-white hover:bg-gray-800"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Button>
          <Button
            variant={isBrowserPage ? "default" : "ghost"}
            size="sm"
            onClick={() => setLocation("/browser")}
            className={`flex items-center gap-2 ${
              isBrowserPage 
                ? "bg-blue-600 text-white hover:bg-blue-700" 
                : "text-gray-300 hover:text-white hover:bg-gray-800"
            }`}
          >
            <Search className="w-4 h-4" />
            Browser
          </Button>
        </div>
      </div>
      <Badge variant="outline" className="bg-blue-600/20 text-blue-300 border-blue-600">
        M5V 3A1
      </Badge>
    </header>
  );
}

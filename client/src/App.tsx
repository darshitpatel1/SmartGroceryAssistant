import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UserProfileSidebar } from "@/components/user-profile-sidebar";
import { GroupInfoSidebar } from "@/components/group-info-sidebar";
import { SidebarProvider, useSidebar } from "@/hooks/useSidebarToggle";
import Dashboard from "@/pages/dashboard";
import Browser from "@/pages/browser";

function Router() {
  const { isVisible } = useSidebar();
  
  return (
    <Switch>
      <Route path="/" component={() => (
        <div className="flex h-screen bg-browser-bg">
          {isVisible && <UserProfileSidebar />}
          <main className="flex-1 overflow-hidden">
            <Dashboard />
          </main>
        </div>
      )} />
      
      <Route path="/browser" component={() => (
        <div className="flex h-screen bg-browser-bg">
          {isVisible && <UserProfileSidebar />}
          <main className="flex-1 overflow-hidden">
            <Browser />
          </main>
        </div>
      )} />
      
      <Route path="/:groupId/browser" component={({ params }) => (
        <div className="flex h-screen bg-browser-bg">
          {isVisible && <GroupInfoSidebar groupId={params?.groupId} />}
          <main className="flex-1 overflow-hidden">
            <Browser />
          </main>
        </div>
      )} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider>
          <Toaster />
          <Router />
        </SidebarProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

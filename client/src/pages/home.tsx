import { Link } from "wouter";
import { Globe, MessageCircle, Settings, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-browser-text mb-4">
          Remote Browser Control
        </h1>
        <p className="text-xl text-browser-text-secondary mb-8">
          Control a headless browser remotely with real-time interaction and AI assistance
        </p>
        <Link href="/browser">
          <Button className="bg-browser-primary hover:bg-browser-primary/90 text-white px-8 py-3">
            Start Browsing
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </Link>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <Card className="bg-browser-surface border-browser-border">
          <CardHeader>
            <Globe className="w-8 h-8 text-browser-primary mb-2" />
            <CardTitle className="text-browser-text">Remote Browser</CardTitle>
            <CardDescription className="text-browser-text-secondary">
              Control a real Chrome browser remotely with live screenshots and interactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-browser-text-secondary space-y-2">
              <li>• Live browser screenshots</li>
              <li>• Click and type interactions</li>
              <li>• Zoom and scroll controls</li>
              <li>• Real-time navigation</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-browser-surface border-browser-border">
          <CardHeader>
            <MessageCircle className="w-8 h-8 text-browser-primary mb-2" />
            <CardTitle className="text-browser-text">AI Assistant</CardTitle>
            <CardDescription className="text-browser-text-secondary">
              Get help with browsing tasks and website navigation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-browser-text-secondary space-y-2">
              <li>• Browsing assistance</li>
              <li>• Navigation guidance</li>
              <li>• Form filling help</li>
              <li>• Real-time support</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-browser-surface border-browser-border">
          <CardHeader>
            <Settings className="w-8 h-8 text-browser-primary mb-2" />
            <CardTitle className="text-browser-text">Customizable</CardTitle>
            <CardDescription className="text-browser-text-secondary">
              Adjust settings for optimal browsing experience
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-browser-text-secondary space-y-2">
              <li>• Viewport configuration</li>
              <li>• Performance settings</li>
              <li>• User preferences</li>
              <li>• Theme options</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="bg-browser-surface border border-browser-border rounded-lg p-6">
        <h2 className="text-2xl font-semibold text-browser-text mb-4">Quick Actions</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Link href="/browser">
            <div className="p-4 border border-browser-border rounded-lg hover:bg-browser-border transition-colors cursor-pointer">
              <h3 className="font-semibold text-browser-text mb-2">Launch Browser</h3>
              <p className="text-sm text-browser-text-secondary">
                Start a new browser session and begin remote browsing
              </p>
            </div>
          </Link>
          <Link href="/settings">
            <div className="p-4 border border-browser-border rounded-lg hover:bg-browser-border transition-colors cursor-pointer">
              <h3 className="font-semibold text-browser-text mb-2">Configure Settings</h3>
              <p className="text-sm text-browser-text-secondary">
                Adjust browser settings and preferences
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* Status */}
      <div className="mt-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-browser-success/10 border border-browser-success/20 rounded-full">
          <div className="w-2 h-2 bg-browser-success rounded-full animate-pulse"></div>
          <span className="text-sm text-browser-success">System Online</span>
        </div>
      </div>
    </div>
  );
}
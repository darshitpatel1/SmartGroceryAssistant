import { useState } from "react";
import { Save, Monitor, Palette, Bell, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    viewport: {
      width: 1280,
      height: 720,
      scale: 100
    },
    performance: {
      framerate: 24,
      quality: 80,
      compression: true
    },
    ui: {
      theme: "dark",
      notifications: true,
      autoSave: true
    },
    browser: {
      javascript: true,
      images: true,
      cookies: true,
      cache: true
    }
  });

  const handleSave = () => {
    // Here you would typically save to localStorage or send to backend
    localStorage.setItem('browserSettings', JSON.stringify(settings));
    toast({
      title: "Settings saved",
      description: "Your preferences have been updated successfully.",
    });
  };

  const updateSetting = (category: keyof typeof settings, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-browser-text mb-2">Settings</h1>
        <p className="text-browser-text-secondary">
          Configure your browser and application preferences
        </p>
      </div>

      <div className="grid gap-6">
        {/* Viewport Settings */}
        <Card className="bg-browser-surface border-browser-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Monitor className="w-5 h-5 text-browser-primary" />
              <CardTitle className="text-browser-text">Viewport Settings</CardTitle>
            </div>
            <CardDescription className="text-browser-text-secondary">
              Configure the browser viewport dimensions and display options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-browser-text">Viewport Width</Label>
                <Select 
                  value={settings.viewport.width.toString()} 
                  onValueChange={(value) => updateSetting('viewport', 'width', parseInt(value))}
                >
                  <SelectTrigger className="bg-browser-bg border-browser-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1280">1280px</SelectItem>
                    <SelectItem value="1920">1920px</SelectItem>
                    <SelectItem value="1024">1024px</SelectItem>
                    <SelectItem value="800">800px</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-browser-text">Viewport Height</Label>
                <Select 
                  value={settings.viewport.height.toString()} 
                  onValueChange={(value) => updateSetting('viewport', 'height', parseInt(value))}
                >
                  <SelectTrigger className="bg-browser-bg border-browser-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="720">720px</SelectItem>
                    <SelectItem value="1080">1080px</SelectItem>
                    <SelectItem value="768">768px</SelectItem>
                    <SelectItem value="600">600px</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-browser-text">Default Scale: {settings.viewport.scale}%</Label>
              <Slider
                value={[settings.viewport.scale]}
                onValueChange={(value) => updateSetting('viewport', 'scale', value[0])}
                min={50}
                max={200}
                step={10}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        {/* Performance Settings */}
        <Card className="bg-browser-surface border-browser-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Monitor className="w-5 h-5 text-browser-primary" />
              <CardTitle className="text-browser-text">Performance</CardTitle>
            </div>
            <CardDescription className="text-browser-text-secondary">
              Optimize performance for your connection and device
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-browser-text">Frame Rate</Label>
                <Select 
                  value={settings.performance.framerate.toString()} 
                  onValueChange={(value) => updateSetting('performance', 'framerate', parseInt(value))}
                >
                  <SelectTrigger className="bg-browser-bg border-browser-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 FPS</SelectItem>
                    <SelectItem value="24">24 FPS</SelectItem>
                    <SelectItem value="30">30 FPS</SelectItem>
                    <SelectItem value="60">60 FPS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-browser-text">Image Quality: {settings.performance.quality}%</Label>
                <Slider
                  value={[settings.performance.quality]}
                  onValueChange={(value) => updateSetting('performance', 'quality', value[0])}
                  min={30}
                  max={100}
                  step={10}
                  className="w-full"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-browser-text">Enable Compression</Label>
                <p className="text-sm text-browser-text-secondary">
                  Compress images to reduce bandwidth usage
                </p>
              </div>
              <Switch
                checked={settings.performance.compression}
                onCheckedChange={(checked) => updateSetting('performance', 'compression', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* UI Settings */}
        <Card className="bg-browser-surface border-browser-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-browser-primary" />
              <CardTitle className="text-browser-text">Interface</CardTitle>
            </div>
            <CardDescription className="text-browser-text-secondary">
              Customize the user interface and notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-browser-text">Theme</Label>
              <Select 
                value={settings.ui.theme} 
                onValueChange={(value) => updateSetting('ui', 'theme', value)}
              >
                <SelectTrigger className="bg-browser-bg border-browser-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="auto">Auto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-browser-text">Notifications</Label>
                <p className="text-sm text-browser-text-secondary">
                  Show system notifications and alerts
                </p>
              </div>
              <Switch
                checked={settings.ui.notifications}
                onCheckedChange={(checked) => updateSetting('ui', 'notifications', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-browser-text">Auto Save Settings</Label>
                <p className="text-sm text-browser-text-secondary">
                  Automatically save changes as you make them
                </p>
              </div>
              <Switch
                checked={settings.ui.autoSave}
                onCheckedChange={(checked) => updateSetting('ui', 'autoSave', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Browser Settings */}
        <Card className="bg-browser-surface border-browser-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-browser-primary" />
              <CardTitle className="text-browser-text">Browser Features</CardTitle>
            </div>
            <CardDescription className="text-browser-text-secondary">
              Control browser features and security settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-browser-text">JavaScript</Label>
                  <p className="text-sm text-browser-text-secondary">
                    Enable JavaScript execution
                  </p>
                </div>
                <Switch
                  checked={settings.browser.javascript}
                  onCheckedChange={(checked) => updateSetting('browser', 'javascript', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-browser-text">Images</Label>
                  <p className="text-sm text-browser-text-secondary">
                    Load images on websites
                  </p>
                </div>
                <Switch
                  checked={settings.browser.images}
                  onCheckedChange={(checked) => updateSetting('browser', 'images', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-browser-text">Cookies</Label>
                  <p className="text-sm text-browser-text-secondary">
                    Accept and store cookies
                  </p>
                </div>
                <Switch
                  checked={settings.browser.cookies}
                  onCheckedChange={(checked) => updateSetting('browser', 'cookies', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-browser-text">Cache</Label>
                  <p className="text-sm text-browser-text-secondary">
                    Enable browser caching
                  </p>
                </div>
                <Switch
                  checked={settings.browser.cache}
                  onCheckedChange={(checked) => updateSetting('browser', 'cache', checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            onClick={handleSave}
            className="bg-browser-primary hover:bg-browser-primary/90 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
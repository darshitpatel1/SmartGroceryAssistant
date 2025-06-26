import { chromium, type Browser, type Page, type BrowserContext } from "playwright";
import type { Socket } from "socket.io";

export class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private socket: Socket;
  private screenshotInterval: NodeJS.Timeout | null = null;

  constructor(socket: Socket) {
    this.socket = socket;
  }

  async navigate(url: string) {
    try {
      console.log("Browsing to:", url);
      this.socket.emit("loading", { status: "starting" });
      
      // Clean up existing browser
      await this.cleanup();

      // Launch Playwright browser
      this.browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
      
      this.context = await this.browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });
      
      this.page = await this.context.newPage();
      
      // Add event listeners
      this.setupEventListeners();
      
      // Navigate to URL
      await this.page.goto(url, { 
        waitUntil: "networkidle",
        timeout: 30000
      });
      
      // Start screenshot streaming
      this.startScreenshots();
      
      const currentUrl = this.page.url();
      this.socket.emit("navigation_complete", { url: currentUrl, canGoBack: false, canGoForward: false });
      this.socket.emit("loading", { status: "complete" });
      
    } catch (error) {
      console.error("Browse error:", error);
      this.socket.emit("loading", { status: "error" });
      this.socket.emit("error", { message: "Failed to navigate to URL" });
    }
  }

  private setupEventListeners() {
    if (!this.page) return;

    this.page.on('request', () => {
      this.socket.emit("loading", { status: "loading" });
    });
    
    this.page.on('load', () => {
      this.socket.emit("loading", { status: "complete" });
    });
    
    this.page.on('framenavigated', () => {
      if (this.page) {
        const currentUrl = this.page.url();
        console.log("URL changed to:", currentUrl);
        this.socket.emit("url_changed", { url: currentUrl, canGoBack: true, canGoForward: false });
      }
    });
  }

  private startScreenshots() {
    if (!this.page) return;
    
    const takeScreenshot = async () => {
      if (!this.page) return;
      
      try {
        const screenshot = await this.page.screenshot({ 
          type: 'jpeg', 
          quality: 60,
          fullPage: false 
        });
        
        this.socket.emit("frame", screenshot.toString('base64'));
      } catch (error) {
        console.error("Screenshot error:", error);
      }
    };
    
    // Take initial screenshot
    takeScreenshot();
    
    // Continue taking screenshots at 5 FPS
    this.screenshotInterval = setInterval(takeScreenshot, 200);
  }

  async click(xNorm: number, yNorm: number) {
    if (!this.page) return;
    
    try {
      const x = xNorm * 1280;
      const y = yNorm * 720;
      
      await this.page.mouse.click(x, y);
      console.log(`Click at: ${x}, ${y}`);
    } catch (error) {
      console.error("Click error:", error);
    }
  }

  async type(text: string) {
    if (!this.page) return;
    
    try {
      await this.page.keyboard.type(text);
      console.log("Typed:", text);
    } catch (error) {
      console.error("Type error:", error);
    }
  }

  async scroll(deltaY: number) {
    if (!this.page) return;
    
    try {
      await this.page.mouse.wheel({ deltaX: 0, deltaY });
      console.log("Scrolled:", deltaY);
    } catch (error) {
      console.error("Scroll error:", error);
    }
  }

  async pressKey(key: string, modifiers?: string[]) {
    if (!this.page) return;
    
    try {
      let keySequence = '';
      if (modifiers?.includes('ctrl')) keySequence += 'Control+';
      if (modifiers?.includes('shift')) keySequence += 'Shift+';
      if (modifiers?.includes('alt')) keySequence += 'Alt+';
      if (modifiers?.includes('meta')) keySequence += 'Meta+';
      keySequence += key;

      await this.page.keyboard.press(keySequence);
      console.log("Key pressed:", keySequence);
    } catch (error) {
      console.error("Key press error:", error);
    }
  }

  async navigate_direction(direction: 'back' | 'forward' | 'refresh') {
    if (!this.page) return;
    
    try {
      this.socket.emit("loading", { status: "loading" });
      let currentUrl;
      
      if (direction === 'back') {
        await this.page.goBack();
        currentUrl = this.page.url();
        console.log("Navigated back to:", currentUrl);
      } else if (direction === 'forward') {
        await this.page.goForward();
        currentUrl = this.page.url();
        console.log("Navigated forward to:", currentUrl);
      } else if (direction === 'refresh') {
        await this.page.reload();
        currentUrl = this.page.url();
        console.log("Page refreshed:", currentUrl);
      }
      
      this.socket.emit("navigation_complete", { url: currentUrl, canGoBack: true, canGoForward: false });
      this.socket.emit("loading", { status: "complete" });
    } catch (error) {
      console.error("Navigation error:", error);
      this.socket.emit("loading", { status: "error" });
    }
  }

  async doubleClick(xNorm: number, yNorm: number) {
    if (!this.page) return;
    
    try {
      const x = xNorm * 1280;
      const y = yNorm * 720;
      
      await this.page.mouse.dblclick(x, y);
      console.log(`Double-clicked at: ${x}, ${y}`);
    } catch (error) {
      console.error("Double click error:", error);
    }
  }

  async focusInput() {
    if (!this.page) return;
    
    try {
      const inputs = await this.page.locator('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea').all();
      for (const input of inputs) {
        if (await input.isVisible() && await input.isEnabled()) {
          await input.focus();
          console.log("Focused input successfully");
          this.socket.emit("input_focused", { success: true });
          return;
        }
      }
      this.socket.emit("input_focused", { success: false });
    } catch (error) {
      console.error("Focus input error:", error);
      this.socket.emit("input_focused", { success: false });
    }
  }

  async zoom(level: number) {
    if (!this.page) return;
    
    try {
      await this.page.evaluate((zoomLevel) => {
        document.body.style.zoom = zoomLevel.toString();
      }, level);
      console.log("Zoom set to:", level);
    } catch (error) {
      console.error("Zoom error:", error);
    }
  }

  async cleanup() {
    if (this.screenshotInterval) {
      clearInterval(this.screenshotInterval);
      this.screenshotInterval = null;
    }
    
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
    }
  }
}
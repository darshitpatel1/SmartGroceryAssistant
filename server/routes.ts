import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { BrowserManager } from "./browser.js";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Create Socket.IO server
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Handle Socket.IO connections
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    
    let browser: Browser | null = null;
    let context: BrowserContext | null = null;
    let page: Page | null = null;

    socket.on("browse", async ({ url }: { url: string }) => {
      try {
        console.log("Browsing to:", url);
        socket.emit("loading", { status: "starting" });
        
        // Clean up existing browser if any
        if (browser) {
          await browser.close();
        }

        // Launch Playwright browser with native behavior
        browser = await chromium.launch({ 
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
          ]
        });
        
        context = await browser.newContext({
          viewport: { width: 1280, height: 720 },
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });
        
        page = await context.newPage();
        
        // Add loading progress tracking
        page.on('request', () => {
          socket.emit("loading", { status: "loading" });
        });
        
        page.on('response', () => {
          socket.emit("loading", { status: "loading" });
        });
        
        page.on('load', () => {
          socket.emit("loading", { status: "complete" });
        });
        
        page.on('framenavigated', () => {
          const currentUrl = page!.url();
          console.log("URL changed to:", currentUrl);
          socket.emit("url_changed", { url: currentUrl, canGoBack: true, canGoForward: false });
        });
        
        // Navigate to URL
        await page.goto(url, { 
          waitUntil: "networkidle",
          timeout: 30000
        });
        
        // Start screenshot streaming
        const startScreenshots = async () => {
          if (!page) return;
          
          const screenshot = await page.screenshot({ 
            type: 'jpeg', 
            quality: 60,
            fullPage: false 
          });
          
          socket.emit("frame", screenshot.toString('base64'));
          
          // Continue taking screenshots
          setTimeout(startScreenshots, 200); // 5 FPS
        };
        
        startScreenshots();
        
        const currentUrl = page.url();
        socket.emit("navigation_complete", { url: currentUrl, canGoBack: false, canGoForward: false });
        socket.emit("loading", { status: "complete" });
        
      } catch (error) {
        console.error("Browse error:", error);
        socket.emit("loading", { status: "error" });
        socket.emit("error", { message: "Failed to navigate to URL" });
      }
    });

    socket.on("click", async ({ xNorm, yNorm }: { xNorm: number; yNorm: number }) => {
      if (!page) return;
      
      try {
        const x = xNorm * 1280; // Use viewport width directly
        const y = yNorm * 720;   // Use viewport height directly
        
        // Use Playwright's native mouse click for precise coordinate clicking
        await page.mouse.click(x, y);
        console.log(`Native click at: ${x}, ${y}`);
        
      } catch (error) {
        console.error("Click error:", error);
      }
    });



    socket.on("type", async ({ text }: { text: string }) => {
      if (!page) return;
      
      try {
        // Use Playwright's native keyboard typing which handles focus automatically
        await page.keyboard.type(text);
        console.log("Typed:", text);
        
      } catch (error) {
        console.error("Type error:", error);
      }
    });

    socket.on("scroll", async ({ deltaY }: { deltaY: number }) => {
      if (!page) return;
      
      try {
        await page.mouse.wheel({ deltaX: 0, deltaY });
        console.log("Scrolled:", deltaY);
      } catch (error) {
        console.error("Scroll error:", error);
      }
    });

    socket.on("key", async ({ key, modifiers }: { key: string; modifiers?: string[] }) => {
      if (!page) return;
      
      try {
        // Use Playwright's native key handling
        let keySequence = '';
        if (modifiers?.includes('ctrl')) keySequence += 'Control+';
        if (modifiers?.includes('shift')) keySequence += 'Shift+';
        if (modifiers?.includes('alt')) keySequence += 'Alt+';
        if (modifiers?.includes('meta')) keySequence += 'Meta+';
        keySequence += key;

        await page.keyboard.press(keySequence);
        console.log("Key pressed:", keySequence);
      } catch (error) {
        console.error("Key press error:", error);
      }
    });

    socket.on("zoom", async ({ level }: { level: number }) => {
      if (!page) return;
      
      try {
        await page.evaluate((zoomLevel) => {
          document.body.style.zoom = zoomLevel.toString();
        }, level);
        console.log("Zoom set to:", level);
      } catch (error) {
        console.error("Zoom error:", error);
      }
    });

    socket.on("navigate", async ({ direction }: { direction: 'back' | 'forward' | 'refresh' }) => {
      if (!page) return;
      
      try {
        socket.emit("loading", { status: "loading" });
        let currentUrl;
        
        if (direction === 'back') {
          await page.goBack();
          currentUrl = page.url();
          console.log("Navigated back to:", currentUrl);
        } else if (direction === 'forward') {
          await page.goForward();
          currentUrl = page.url();
          console.log("Navigated forward to:", currentUrl);
        } else if (direction === 'refresh') {
          await page.reload();
          currentUrl = page.url();
          console.log("Page refreshed:", currentUrl);
        }
        
        socket.emit("navigation_complete", { url: currentUrl, canGoBack: true, canGoForward: false });
        socket.emit("loading", { status: "complete" });
      } catch (error) {
        console.error("Navigation error:", error);
        socket.emit("loading", { status: "error" });
      }
    });

    socket.on("focus_input", async () => {
      if (!page) return;
      
      try {
        // Use Playwright's built-in focus capabilities
        const inputs = await page.locator('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea').all();
        for (const input of inputs) {
          if (await input.isVisible() && await input.isEnabled()) {
            await input.focus();
            console.log("Focused input successfully");
            socket.emit("input_focused", { success: true });
            return;
          }
        }
        socket.emit("input_focused", { success: false });
      } catch (error) {
        console.error("Focus input error:", error);
        socket.emit("input_focused", { success: false });
      }
    });

    socket.on("double_click", async ({ xNorm, yNorm }: { xNorm: number; yNorm: number }) => {
      if (!page) return;
      
      try {
        const x = xNorm * 1280;
        const y = yNorm * 720;
        
        await page.mouse.dblclick(x, y);
        console.log(`Double-clicked at: ${x}, ${y}`);
        
      } catch (error) {
        console.error("Double click error:", error);
      }
    });

    socket.on("disconnect", async () => {
      console.log("Client disconnected:", socket.id);
      if (browser) {
        await browser.close();
      }
    });
  });

  return httpServer;
}

import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import puppeteer, { type Browser, type Page, type CDPSession } from "puppeteer";

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
    let page: Page | null = null;
    let cdp: CDPSession | null = null;

    socket.on("browse", async ({ url }: { url: string }) => {
      try {
        console.log("Browsing to:", url);
        socket.emit("loading", { status: "starting" });
        
        // Clean up existing browser
        if (browser) {
          await browser.close();
        }

        // Launch browser with optimized settings
        browser = await puppeteer.launch({ 
          headless: true,
          executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
          ]
        });
        
        page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 720 });
        
        // Enhanced page setup for native interactions
        await page.evaluateOnNewDocument(() => {
          // Override click events to ensure proper focus
          document.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
              setTimeout(() => target.focus(), 0);
            }
          });
          
          // Prevent focus loss
          document.addEventListener('blur', (e) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
              setTimeout(() => target.focus(), 100);
            }
          }, true);
        });
        
        // Loading progress tracking
        page.on('request', () => {
          socket.emit("loading", { status: "loading" });
        });
        
        page.on('response', () => {
          socket.emit("loading", { status: "loading" });
        });
        
        page.on('load', () => {
          socket.emit("loading", { status: "complete" });
        });
        
        // Navigate to URL
        await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
        
        // Set up CDP for screen capture
        cdp = await page.target().createCDPSession();
        await cdp.send("Page.enable");
        await cdp.send("Page.startScreencast", { 
          format: "jpeg", 
          quality: 60 
        });

        // Handle screen frames
        cdp.on("Page.screencastFrame", async ({ data, sessionId }) => {
          socket.emit("frame", data);
          await cdp!.send("Page.screencastFrameAck", { sessionId });
        });

        // URL change tracking
        page.on('framenavigated', (frame) => {
          if (frame === page!.mainFrame()) {
            const currentUrl = page!.url();
            console.log("URL changed to:", currentUrl);
            socket.emit("url_changed", { url: currentUrl, canGoBack: true, canGoForward: false });
          }
        });

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
        const viewport = page.viewport();
        if (viewport) {
          const x = xNorm * viewport.width;
          const y = yNorm * viewport.height;
          
          // Enhanced click with element detection and focus handling
          await page.evaluate((clickX, clickY) => {
            const element = document.elementFromPoint(clickX, clickY) as HTMLElement;
            if (element) {
              // Force click and focus for input elements
              if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.contentEditable === 'true') {
                element.focus();
                element.click();
                // Ensure cursor placement
                if ('selectionStart' in element) {
                  const inputElement = element as HTMLInputElement;
                  const rect = element.getBoundingClientRect();
                  const relativeX = clickX - rect.left;
                  const charPos = Math.floor((relativeX / rect.width) * inputElement.value.length);
                  inputElement.setSelectionRange(charPos, charPos);
                }
              } else {
                element.click();
              }
            }
          }, x, y);
          
          // Physical click as backup
          await page.mouse.click(x, y);
          console.log(`Enhanced click at: ${x}, ${y}`);
        }
      } catch (error) {
        console.error("Click error:", error);
      }
    });

    socket.on("type", async ({ text }: { text: string }) => {
      if (!page) return;
      
      try {
        // Enhanced typing with focus management
        const success = await page.evaluate((textToType) => {
          const activeElement = document.activeElement as HTMLElement;
          
          // Type into focused element
          if (activeElement && 
              (activeElement.tagName === 'INPUT' || 
               activeElement.tagName === 'TEXTAREA' || 
               activeElement.contentEditable === 'true')) {
            
            if ('value' in activeElement) {
              (activeElement as HTMLInputElement).value = textToType;
              activeElement.dispatchEvent(new Event('input', { bubbles: true }));
              activeElement.dispatchEvent(new Event('change', { bubbles: true }));
              return true;
            }
          }
          
          // Find and focus best input if none focused
          const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="search"], input[type="email"], input[type="password"], textarea'));
          for (const input of inputs) {
            const element = input as HTMLElement;
            const rect = element.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0 && !element.hasAttribute('disabled')) {
              element.focus();
              (element as HTMLInputElement).value = textToType;
              element.dispatchEvent(new Event('input', { bubbles: true }));
              element.dispatchEvent(new Event('change', { bubbles: true }));
              return true;
            }
          }
          return false;
        }, text);
        
        if (!success) {
          await page.keyboard.type(text);
        }
        
        console.log("Typed:", text);
      } catch (error) {
        console.error("Type error:", error);
      }
    });

    socket.on("scroll", async ({ deltaY }: { deltaY: number }) => {
      if (!page) return;
      
      try {
        await page.mouse.wheel({ deltaY });
        console.log("Scrolled:", deltaY);
      } catch (error) {
        console.error("Scroll error:", error);
      }
    });

    socket.on("key", async ({ key, modifiers }: { key: string; modifiers?: string[] }) => {
      if (!page) return;
      
      try {
        const options: any = {};
        if (modifiers?.includes('ctrl')) options.ctrl = true;
        if (modifiers?.includes('shift')) options.shift = true;
        if (modifiers?.includes('alt')) options.alt = true;
        if (modifiers?.includes('meta')) options.meta = true;

        await page.keyboard.press(key as any, options);
        console.log("Key pressed:", key, modifiers);
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
        } else if (direction === 'forward') {
          await page.goForward();
          currentUrl = page.url();
        } else if (direction === 'refresh') {
          await page.reload();
          currentUrl = page.url();
        }
        
        socket.emit("navigation_complete", { url: currentUrl, canGoBack: true, canGoForward: false });
        socket.emit("loading", { status: "complete" });
        console.log("Navigation complete:", currentUrl);
      } catch (error) {
        console.error("Navigation error:", error);
        socket.emit("loading", { status: "error" });
      }
    });

    socket.on("focus_input", async () => {
      if (!page) return;
      
      try {
        const focused = await page.evaluate(() => {
          const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea'));
          for (const input of inputs) {
            const element = input as HTMLElement;
            const rect = element.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0 && !element.hasAttribute('disabled')) {
              element.focus();
              return { success: true, tagName: element.tagName.toLowerCase() };
            }
          }
          return { success: false };
        });
        
        socket.emit("input_focused", focused);
        console.log("Focus input result:", focused);
      } catch (error) {
        console.error("Focus input error:", error);
      }
    });

    socket.on("double_click", async ({ xNorm, yNorm }: { xNorm: number; yNorm: number }) => {
      if (!page) return;
      
      try {
        const viewport = page.viewport();
        if (viewport) {
          const x = xNorm * viewport.width;
          const y = yNorm * viewport.height;
          
          await page.mouse.click(x, y, { clickCount: 2 });
          console.log(`Double-clicked at: ${x}, ${y}`);
        }
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

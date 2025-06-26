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
          
          // Enhanced click with proper timing for dropdowns and stable focus
          const elementInfo = await page.evaluate((clickX, clickY) => {
            const element = document.elementFromPoint(clickX, clickY) as HTMLElement;
            if (!element) return { type: 'none' };
            
            const tagName = element.tagName.toLowerCase();
            const hasDropdown = element.querySelector('select, option') || 
                               element.closest('select, .dropdown, [role="listbox"], [role="menu"]') ||
                               element.getAttribute('role') === 'button' ||
                               element.classList.contains('dropdown') ||
                               element.classList.contains('select');
            
            const isInput = tagName === 'input' || tagName === 'textarea' || element.contentEditable === 'true';
            
            return {
              type: hasDropdown ? 'dropdown' : (isInput ? 'input' : 'normal'),
              tagName,
              rect: element.getBoundingClientRect()
            };
          }, x, y);
          
          if (elementInfo.type === 'dropdown') {
            // For dropdowns: hover first, wait, then click with delays
            await page.mouse.move(x, y);
            await new Promise(resolve => setTimeout(resolve, 100));
            await page.mouse.click(x, y);
            await new Promise(resolve => setTimeout(resolve, 150));
            // Second click if dropdown didn't open
            await page.mouse.click(x, y);
            console.log(`Dropdown click at: ${x}, ${y}`);
          } else if (elementInfo.type === 'input') {
            // For inputs: focus first, then position cursor properly
            await page.mouse.click(x, y);
            await page.evaluate((clickX, clickY) => {
              const element = document.elementFromPoint(clickX, clickY) as HTMLInputElement;
              if (element && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')) {
                element.focus();
                // Position cursor at end of existing text
                if ('selectionStart' in element) {
                  const textLength = element.value.length;
                  element.setSelectionRange(textLength, textLength);
                }
              }
            }, x, y);
            console.log(`Input click at: ${x}, ${y}`);
          } else {
            // Normal elements: single clean click
            await page.mouse.click(x, y);
            console.log(`Normal click at: ${x}, ${y}`);
          }
        }
      } catch (error) {
        console.error("Click error:", error);
      }
    });

    socket.on("type", async ({ text }: { text: string }) => {
      if (!page) return;
      
      try {
        // Fixed typing - append characters instead of overwriting
        const success = await page.evaluate((textToType) => {
          const activeElement = document.activeElement as HTMLInputElement;
          
          // Type into focused element by appending to existing value
          if (activeElement && 
              (activeElement.tagName === 'INPUT' || 
               activeElement.tagName === 'TEXTAREA' || 
               activeElement.contentEditable === 'true')) {
            
            if ('value' in activeElement) {
              // Get current cursor position
              const cursorPos = activeElement.selectionStart || activeElement.value.length;
              const currentValue = activeElement.value;
              
              // Insert new text at cursor position
              const newValue = currentValue.slice(0, cursorPos) + textToType + currentValue.slice(cursorPos);
              activeElement.value = newValue;
              
              // Move cursor to after inserted text
              const newCursorPos = cursorPos + textToType.length;
              activeElement.setSelectionRange(newCursorPos, newCursorPos);
              
              // Trigger events
              activeElement.dispatchEvent(new Event('input', { bubbles: true }));
              activeElement.dispatchEvent(new Event('change', { bubbles: true }));
              return true;
            }
          }
          
          // Find and focus best input if none focused
          const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="search"], input[type="email"], input[type="password"], textarea'));
          for (const input of inputs) {
            const element = input as HTMLInputElement;
            const rect = element.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0 && !element.hasAttribute('disabled')) {
              element.focus();
              element.value = textToType;
              element.dispatchEvent(new Event('input', { bubbles: true }));
              element.dispatchEvent(new Event('change', { bubbles: true }));
              return true;
            }
          }
          return false;
        }, text);
        
        if (!success) {
          // Use keyboard.type character by character with small delays
          for (const char of text) {
            await page.keyboard.type(char, { delay: 50 });
          }
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

import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import puppeteer, { type Browser, type Page, type CDPSession } from "puppeteer";
import { WebSocketServer } from "ws";

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
        
        // Clean up existing browser if any
        if (browser) {
          await browser.close();
        }

        // Launch new browser
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
        
        // Navigate to URL
        await page.goto(url, { waitUntil: "domcontentloaded" });
        
        // Set up CDP for screen capture
        cdp = await page.target().createCDPSession();
        await cdp.send("Page.enable");
        await cdp.send("Page.startScreencast", { 
          format: "jpeg", 
          quality: 50 
        });

        // Handle screen frames
        cdp.on("Page.screencastFrame", async ({ data, sessionId }) => {
          socket.emit("frame", data);
          await cdp!.send("Page.screencastFrameAck", { sessionId });
        });

        // Listen for URL changes
        page.on('framenavigated', (frame) => {
          if (frame === page!.mainFrame() && page) {
            const currentUrl = page.url();
            console.log("URL changed to:", currentUrl);
            page.evaluate(() => window.history.length > 1).then(canGoBack => {
              socket.emit("url_changed", { url: currentUrl, canGoBack, canGoForward: false });
            }).catch(() => {
              socket.emit("url_changed", { url: currentUrl, canGoBack: false, canGoForward: false });
            });
          }
        });

        // Get current URL and navigation state
        const currentUrl = page.url();
        const canGoBack = await page.evaluate(() => window.history.length > 1);
        const canGoForward = false; // Will be updated by navigation events
        
        socket.emit("navigation_complete", { url: currentUrl, canGoBack, canGoForward });
      } catch (error) {
        console.error("Browse error:", error);
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
          
          // Get element at coordinates to determine interaction type
          const elementInfo = await page.evaluate((clickX, clickY) => {
            const element = document.elementFromPoint(clickX, clickY) as HTMLElement;
            if (!element) return null;
            
            const tagName = element.tagName.toLowerCase();
            const type = element.getAttribute('type');
            const isInput = tagName === 'input' || tagName === 'textarea';
            const isButton = tagName === 'button' || tagName === 'a' || element.onclick !== null;
            const isClickable = element.style.cursor === 'pointer' || 
                              element.getAttribute('role') === 'button' ||
                              isButton;
            const isContentEditable = element.contentEditable === 'true';
            const isSelect = tagName === 'select';
            
            return {
              tagName,
              type,
              isInput,
              isButton,
              isClickable,
              isContentEditable,
              isSelect,
              className: element.className,
              id: element.id
            };
          }, x, y);
          
          // Enhanced click handling based on element type
          if (elementInfo?.isInput || elementInfo?.isContentEditable) {
            // For input fields, click and focus
            await page.mouse.click(x, y);
            await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for focus
            
            // Ensure the element is focused
            await page.evaluate((clickX, clickY) => {
              const element = document.elementFromPoint(clickX, clickY) as HTMLInputElement;
              if (element && (element.tagName.toLowerCase() === 'input' || 
                             element.tagName.toLowerCase() === 'textarea' ||
                             element.contentEditable === 'true')) {
                element.focus();
                // For text inputs, place cursor at click position if possible
                if (element.type === 'text' || element.type === 'email' || 
                    element.type === 'password' || element.tagName.toLowerCase() === 'textarea') {
                  element.click();
                }
              }
            }, x, y);
            
            console.log(`Clicked and focused input at: ${x}, ${y}`);
          } else if (elementInfo?.isSelect) {
            // For select elements, click to open dropdown
            await page.mouse.click(x, y);
            console.log(`Clicked select element at: ${x}, ${y}`);
          } else {
            // For other elements, use regular click
            await page.mouse.click(x, y);
            console.log(`Clicked at: ${x}, ${y}`);
          }
          
          // Send element info back to client for debugging
          socket.emit("element_clicked", elementInfo);
        }
      } catch (error) {
        console.error("Click error:", error);
      }
    });



    socket.on("type", async ({ text }: { text: string }) => {
      if (!page) return;
      
      try {
        // Check if there's a focused input element
        const focusedElement = await page.evaluate(() => {
          const active = document.activeElement as HTMLElement;
          if (!active) return null;
          
          const tagName = active.tagName.toLowerCase();
          const isInput = tagName === 'input' || tagName === 'textarea';
          const isContentEditable = active.contentEditable === 'true';
          
          return {
            tagName,
            type: active.getAttribute('type'),
            isInput,
            isContentEditable,
            canType: isInput || isContentEditable
          };
        });
        
        if (focusedElement?.canType) {
          // Type directly into the focused element
          await page.keyboard.type(text);
          console.log("Typed into focused element:", text);
        } else {
          // Try to find and focus the first available input
          const inputFocused = await page.evaluate(() => {
            const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, [contenteditable="true"]'));
            for (const input of inputs) {
              const element = input as HTMLElement;
              if (element.offsetParent !== null && !element.hasAttribute('disabled')) {
                element.focus();
                return true;
              }
            }
            return false;
          });
          
          if (inputFocused) {
            await new Promise(resolve => setTimeout(resolve, 100)); // Wait for focus
            await page.keyboard.type(text);
            console.log("Typed into auto-focused input:", text);
          } else {
            // Fall back to regular typing (for keyboard shortcuts, etc.)
            await page.keyboard.type(text);
            console.log("Typed globally:", text);
          }
        }
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
        // Handle modifier keys
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
        
        // Send updated navigation state
        const canGoBack = await page.evaluate(() => window.history.length > 1);
        const canGoForward = false; // Browser API doesn't provide this easily
        socket.emit("navigation_complete", { url: currentUrl, canGoBack, canGoForward });
      } catch (error) {
        console.error("Navigation error:", error);
      }
    });

    // New event for better input focusing
    socket.on("focus_input", async () => {
      if (!page) return;
      
      try {
        const focused = await page.evaluate(() => {
          const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="image"]), textarea, [contenteditable="true"]'));
          
          // First try to focus the first visible, enabled input
          for (const input of inputs) {
            const element = input as HTMLElement;
            const rect = element.getBoundingClientRect();
            
            if (element.offsetParent !== null && 
                !element.hasAttribute('disabled') &&
                !element.hasAttribute('readonly') &&
                rect.width > 0 && rect.height > 0) {
              element.focus();
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              return {
                success: true,
                tagName: element.tagName.toLowerCase(),
                type: element.getAttribute('type'),
                placeholder: element.getAttribute('placeholder') || '',
                id: element.id,
                className: element.className
              };
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

    // Double-click for better element interaction
    socket.on("double_click", async ({ xNorm, yNorm }: { xNorm: number; yNorm: number }) => {
      if (!page) return;
      
      try {
        const viewport = page.viewport();
        if (viewport) {
          const x = xNorm * viewport.width;
          const y = yNorm * viewport.height;
          
          // Perform double click
          await page.mouse.click(x, y, { clickCount: 2 });
          console.log(`Double-clicked at: ${x}, ${y}`);
          
          // Check if we selected text or focused an input
          const result = await page.evaluate(() => {
            const selection = window.getSelection();
            const activeElement = document.activeElement;
            return {
              hasSelection: selection ? selection.toString().length > 0 : false,
              focusedElement: activeElement ? {
                tagName: activeElement.tagName.toLowerCase(),
                type: activeElement.getAttribute('type')
              } : null
            };
          });
          
          socket.emit("double_click_result", result);
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

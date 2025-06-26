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
        
        // Auto-dismiss popups and enhance input focusing for Flipp.com
        await page.evaluateOnNewDocument(() => {
          // Auto-click Accept All and dismiss popups
          const autoClickPopups = () => {
            // Cookie consent "Accept All"
            const acceptButtons = document.querySelectorAll('button');
            acceptButtons.forEach(btn => {
              const text = btn.textContent?.toLowerCase() || '';
              if (text.includes('accept all') || text.includes('accept')) {
                console.log('Auto-clicking Accept All button');
                (btn as HTMLButtonElement).click();
              }
            });
            
            // App download popup close buttons
            const closeSelectors = ['button', '[role="button"]', '.close', '[aria-label*="close" i]'];
            closeSelectors.forEach(selector => {
              const buttons = document.querySelectorAll(selector);
              buttons.forEach(btn => {
                const element = btn as HTMLElement;
                const ariaLabel = element.getAttribute('aria-label')?.toLowerCase() || '';
                const className = element.className?.toLowerCase() || '';
                if (ariaLabel.includes('close') || className.includes('close') || 
                    element.textContent?.includes('×') || element.textContent?.includes('✕')) {
                  console.log('Auto-clicking close button');
                  element.click();
                }
              });
            });
            
            // Remove download popups by hiding them
            const popups = document.querySelectorAll('[class*="popup"], [class*="modal"], [class*="overlay"]');
            popups.forEach(popup => {
              const element = popup as HTMLElement;
              if (element.textContent?.includes('Download') || element.textContent?.includes('app')) {
                element.style.display = 'none';
                console.log('Auto-hiding app download popup');
              }
            });
          };
          
          // Run popup dismissal immediately and on content changes
          setTimeout(autoClickPopups, 1000);
          setTimeout(autoClickPopups, 3000);
          setTimeout(autoClickPopups, 5000);
          
          // Enhanced search input focusing
          const setupSearchInputs = () => {
            const searchInputs = document.querySelectorAll('input[placeholder*="search" i], input[placeholder*="Search" i], input[placeholder*="flyers" i]');
            searchInputs.forEach(input => {
              const element = input as HTMLInputElement;
              if (!element.dataset.focusSetup) {
                element.dataset.focusSetup = 'true';
                element.addEventListener('click', () => {
                  setTimeout(() => {
                    element.focus();
                    element.select();
                  }, 10);
                });
              }
            });
          };
          
          // Setup inputs and monitor for new ones
          document.addEventListener('DOMContentLoaded', () => {
            setupSearchInputs();
            autoClickPopups();
            
            const observer = new MutationObserver(() => {
              setupSearchInputs();
              autoClickPopups();
            });
            observer.observe(document.body, { childList: true, subtree: true });
          });
          
          // Immediate setup
          setupSearchInputs();
        });
        
        // Simplified loading tracking
        let loadingTimeout: NodeJS.Timeout;
        
        page.on('load', () => {
          clearTimeout(loadingTimeout);
          socket.emit("loading", { status: "complete" });
        });
        
        page.on('domcontentloaded', () => {
          clearTimeout(loadingTimeout);
          socket.emit("loading", { status: "complete" });
        });
        
        // Navigate to URL with faster loading
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
        
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

        // Simple URL tracking
        page.on('framenavigated', (frame) => {
          if (frame === page!.mainFrame()) {
            const currentUrl = page!.url();
            console.log("URL changed to:", currentUrl);
            socket.emit("url_changed", { url: currentUrl, canGoBack: true, canGoForward: false });
            socket.emit("loading", { status: "complete" });
          }
        });

        socket.emit("navigation_complete", { url: page.url(), canGoBack: false, canGoForward: false });
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
          
          // Click first
          await page.mouse.click(x, y);
          
          // Wait a bit for any navigation to settle
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Enhanced focus detection for search inputs
          try {
            const focusResult = await page.evaluate((clickX, clickY) => {
              try {
                let element = document.elementFromPoint(clickX, clickY) as HTMLElement;
                if (!element) return { focused: false, reason: 'no element found' };
                
                // If clicking on a div/wrapper, look for input inside or nearby
                if (element.tagName.toLowerCase() !== 'input') {
                  // Check if clicked element contains an input
                  const inputInside = element.querySelector('input');
                  if (inputInside) {
                    element = inputInside as HTMLElement;
                  } else {
                    // Look for nearby search inputs
                    const searchInputs = document.querySelectorAll('input[placeholder*="search" i], input[placeholder*="Search" i], input[placeholder*="flyers" i]');
                    if (searchInputs.length > 0) {
                      element = searchInputs[0] as HTMLElement;
                    }
                  }
                }
                
                const tagName = element.tagName.toLowerCase();
                const isInput = tagName === 'input' || tagName === 'textarea' || element.contentEditable === 'true';
                
                if (isInput) {
                  // Multiple focus methods
                  element.focus();
                  element.click();
                  (element as HTMLInputElement).select();
                  
                  // Clear any existing value for search
                  if ('value' in element && element.getAttribute('placeholder')?.toLowerCase().includes('search')) {
                    (element as HTMLInputElement).value = '';
                  }
                  
                  // Verify focus worked
                  const isFocused = document.activeElement === element;
                  return { 
                    focused: isFocused, 
                    tagName, 
                    placeholder: element.getAttribute('placeholder') || '',
                    value: 'value' in element ? (element as HTMLInputElement).value : ''
                  };
                }
                
                return { focused: false, reason: 'not an input element', tagName, className: element.className };
              } catch (e: any) {
                return { focused: false, reason: 'evaluation error', error: String(e) };
              }
            }, x, y);
            
            console.log(`Click at: ${x}, ${y} - Focus result:`, focusResult);
          } catch (evalError) {
            console.log(`Click at: ${x}, ${y} - Focus evaluation failed:`, String(evalError));
          }
        }
      } catch (error) {
        console.error("Click error:", error);
      }
    });

    socket.on("type", async ({ text }: { text: string }) => {
      if (!page) return;
      
      try {
        // Simple reliable typing
        await page.keyboard.type(text, { delay: 100 });
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
        
        if (direction === 'back') {
          await page.goBack({ waitUntil: "domcontentloaded" });
        } else if (direction === 'forward') {
          await page.goForward({ waitUntil: "domcontentloaded" });
        } else if (direction === 'refresh') {
          await page.reload({ waitUntil: "domcontentloaded" });
        }
        
        const currentUrl = page.url();
        socket.emit("navigation_complete", { url: currentUrl, canGoBack: true, canGoForward: false });
        socket.emit("loading", { status: "complete" });
        console.log("Navigation complete:", currentUrl);
      } catch (error) {
        console.error("Navigation error:", error);
        socket.emit("loading", { status: "complete" });
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

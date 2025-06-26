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
          
          console.log(`Clicking at: ${x}, ${y} (normalized: ${xNorm}, ${yNorm})`);
          
          // Get element at click position and determine interaction type
          const elementInfo = await page.evaluate((clickX, clickY) => {
            const element = document.elementFromPoint(clickX, clickY) as HTMLElement;
            if (!element) return { type: 'none' };
            
            const tagName = element.tagName.toLowerCase();
            const role = element.getAttribute('role');
            const className = element.className || '';
            const ariaExpanded = element.getAttribute('aria-expanded');
            
            // Check if it's an input field
            if (tagName === 'input' || tagName === 'textarea') {
              const inputType = (element as HTMLInputElement).type || 'text';
              return { 
                type: 'input', 
                tagName,
                inputType,
                placeholder: (element as HTMLInputElement).placeholder || '',
                value: (element as HTMLInputElement).value || ''
              };
            }
            
            // Check for dropdown/select elements
            if (tagName === 'select' || 
                role === 'combobox' || 
                role === 'listbox' ||
                className.includes('dropdown') ||
                className.includes('select') ||
                ariaExpanded !== null) {
              return { type: 'dropdown', tagName, role, className };
            }
            
            // Check for buttons and clickable elements
            if (tagName === 'button' || 
                tagName === 'a' ||
                role === 'button' ||
                element.onclick ||
                className.includes('btn') ||
                className.includes('button') ||
                element.style.cursor === 'pointer') {
              return { type: 'button', tagName, role, text: element.textContent?.trim() || '' };
            }
            
            // Check for form elements
            if (element.closest('form')) {
              return { type: 'form_element', tagName };
            }
            
            return { type: 'generic', tagName };
          }, x, y);
          
          // Handle different element types with appropriate interactions
          switch (elementInfo.type) {
            case 'input':
              // For input fields, click and focus
              await page.mouse.click(x, y);
              await new Promise(resolve => setTimeout(resolve, 100));
              
              // Ensure focus and place cursor at click position
              await page.evaluate((clickX, clickY) => {
                const element = document.elementFromPoint(clickX, clickY) as HTMLInputElement;
                if (element && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')) {
                  element.focus();
                  
                  // Try to position cursor at click location for text inputs
                  if (element.type === 'text' || element.type === 'search' || element.tagName === 'TEXTAREA') {
                    const rect = element.getBoundingClientRect();
                    const relativeX = clickX - rect.left;
                    const textWidth = element.scrollWidth;
                    const approximatePosition = Math.round((relativeX / textWidth) * element.value.length);
                    
                    try {
                      element.setSelectionRange(approximatePosition, approximatePosition);
                    } catch (e) {
                      // If positioning fails, just focus at the end
                      element.setSelectionRange(element.value.length, element.value.length);
                    }
                  }
                }
              }, x, y);
              
              socket.emit("element_interacted", { type: 'input', success: true });
              break;
              
            case 'dropdown':
              // For dropdowns, try multiple interaction methods
              await page.mouse.click(x, y);
              await new Promise(resolve => setTimeout(resolve, 200));
              
              // Check if dropdown opened, if not try hover + click
              const dropdownOpened = await page.evaluate(() => {
                const openDropdowns = document.querySelectorAll('[aria-expanded="true"], .open, .active, [class*="open"]');
                return openDropdowns.length > 0;
              });
              
              if (!dropdownOpened) {
                await page.mouse.move(x, y);
                await new Promise(resolve => setTimeout(resolve, 100));
                await page.mouse.click(x, y);
              }
              
              socket.emit("element_interacted", { type: 'dropdown', success: true });
              break;
              
            case 'button':
              // For buttons, simple click with small delay
              await page.mouse.click(x, y);
              await new Promise(resolve => setTimeout(resolve, 150));
              socket.emit("element_interacted", { type: 'button', success: true });
              break;
              
            default:
              // Generic click for other elements
              await page.mouse.click(x, y);
              await new Promise(resolve => setTimeout(resolve, 100));
              socket.emit("element_interacted", { type: 'generic', success: true });
          }
          
        }
      } catch (error) {
        console.error("Click error:", error);
        socket.emit("element_interacted", { type: 'error', success: false, error: String(error) });
      }
    });

    socket.on("doubleClick", async ({ xNorm, yNorm }: { xNorm: number; yNorm: number }) => {
      if (!page) return;
      
      try {
        const viewport = page.viewport();
        if (viewport) {
          const x = xNorm * viewport.width;
          const y = yNorm * viewport.height;
          
          console.log(`Double-clicking at: ${x}, ${y}`);
          await page.mouse.click(x, y, { clickCount: 2 });
        }
      } catch (error) {
        console.error("Double-click error:", error);
      }
    });

    socket.on("type", async ({ text }: { text: string }) => {
      if (!page) return;
      
      try {
        console.log("Typing:", text);
        
        // First, ensure we have a focused input element
        const focusedElement = await page.evaluate(() => {
          const activeElement = document.activeElement as HTMLElement;
          if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
            return {
              tagName: activeElement.tagName,
              type: (activeElement as HTMLInputElement).type || 'text',
              value: (activeElement as HTMLInputElement).value || '',
              placeholder: (activeElement as HTMLInputElement).placeholder || ''
            };
          }
          
          // If no input is focused, try to find and focus the first visible input
          const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea'));
          for (const input of inputs) {
            const element = input as HTMLInputElement;
            const rect = element.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0 && !element.disabled) {
              element.focus();
              return {
                tagName: element.tagName,
                type: element.type || 'text',
                value: element.value || '',
                placeholder: element.placeholder || ''
              };
            }
          }
          
          return null;
        });
        
        if (focusedElement) {
          // Clear the current value if it's a search input and type the new text
          if (focusedElement.type === 'search' || focusedElement.placeholder.toLowerCase().includes('search')) {
            await page.keyboard.down('ControlLeft');
            await page.keyboard.press('KeyA');
            await page.keyboard.up('ControlLeft');
            await new Promise(resolve => setTimeout(resolve, 50));
          }
          
          // Type the text with proper delay
          await page.keyboard.type(text, { delay: 30 });
          
          socket.emit("text_typed", { 
            success: true, 
            elementType: focusedElement.tagName,
            inputType: focusedElement.type 
          });
        } else {
          // No input found, just type anyway (might work for some elements)
          await page.keyboard.type(text, { delay: 50 });
          socket.emit("text_typed", { success: false, reason: "No input element found" });
        }
        
      } catch (error) {
        console.error("Type error:", error);
        socket.emit("text_typed", { success: false, error: String(error) });
      }
    });

    socket.on("scroll", async ({ deltaY }: { deltaY: number }) => {
      if (!page) return;
      
      try {
        // Normalize scroll amount for better control
        const scrollAmount = Math.sign(deltaY) * Math.min(Math.abs(deltaY), 300);
        
        // Try page scrolling first
        const scrolled = await page.evaluate((scroll) => {
          // Check if we can scroll the main document
          const beforeScrollY = window.scrollY;
          window.scrollBy(0, scroll);
          const afterScrollY = window.scrollY;
          
          if (beforeScrollY !== afterScrollY) {
            return { success: true, method: 'window', scrolled: afterScrollY - beforeScrollY };
          }
          
          // If window scroll didn't work, try scrolling the focused element
          const activeElement = document.activeElement as HTMLElement;
          if (activeElement && activeElement.scrollHeight > activeElement.clientHeight) {
            const beforeScroll = activeElement.scrollTop;
            activeElement.scrollBy(0, scroll);
            const afterScroll = activeElement.scrollTop;
            
            if (beforeScroll !== afterScroll) {
              return { success: true, method: 'element', scrolled: afterScroll - beforeScroll };
            }
          }
          
          // Try finding a scrollable container
          const scrollableElements = document.querySelectorAll('*');
          for (const element of scrollableElements) {
            const el = element as HTMLElement;
            if (el.scrollHeight > el.clientHeight && 
                getComputedStyle(el).overflowY !== 'hidden') {
              const beforeScroll = el.scrollTop;
              el.scrollBy(0, scroll);
              const afterScroll = el.scrollTop;
              
              if (beforeScroll !== afterScroll) {
                return { success: true, method: 'container', scrolled: afterScroll - beforeScroll };
              }
            }
          }
          
          return { success: false, method: 'none', scrolled: 0 };
        }, scrollAmount);
        
        if (!scrolled.success) {
          // Fallback: use mouse wheel event
          await page.mouse.wheel({ deltaY: scrollAmount });
        }
        
        console.log("Scrolled:", scrollAmount, "Method:", scrolled.method);
        socket.emit("scroll_complete", { 
          deltaY: scrollAmount, 
          method: scrolled.method, 
          actualScroll: scrolled.scrolled 
        });
        
      } catch (error) {
        console.error("Scroll error:", error);
        socket.emit("scroll_complete", { success: false, error: String(error) });
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

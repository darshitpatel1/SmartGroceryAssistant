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

        // Launch new browser with more stable configuration
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
            '--disable-gpu',
            '--disable-web-security',
            '--disable-blink-features=AutomationControlled',
            '--disable-extensions',
            '--disable-plugins'
          ]
        });
        
        page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 720 });
        
        // Set user agent to avoid detection
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Inject JavaScript to improve interaction reliability
        await page.evaluateOnNewDocument(() => {
          // Prevent focus loss and improve input handling
          let lastFocusedElement: HTMLElement | null = null;
          
          document.addEventListener('focusin', (e) => {
            lastFocusedElement = e.target as HTMLElement;
          });
          
          // Maintain focus on inputs
          document.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
              setTimeout(() => {
                target.focus();
              }, 10);
            }
          });
          
          // Store last focused element globally for typing
          (window as any).__lastFocusedInput = () => lastFocusedElement;
        });
        
        // Navigate to URL with better error handling
        await page.goto(url, { 
          waitUntil: "networkidle0",
          timeout: 30000
        });
        
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
          
          // Advanced element interaction using page.evaluate for better reliability
          const clickResult = await page.evaluate((clickX, clickY) => {
            const element = document.elementFromPoint(clickX, clickY) as HTMLElement;
            if (!element) return { success: false, reason: 'No element found' };
            
            const tagName = element.tagName.toLowerCase();
            const type = element.getAttribute('type') || '';
            const isInput = tagName === 'input' || tagName === 'textarea';
            const isContentEditable = element.contentEditable === 'true';
            const isClickable = tagName === 'button' || tagName === 'a' || 
                              element.onclick !== null ||
                              element.style.cursor === 'pointer' ||
                              element.getAttribute('role') === 'button';
            
            try {
              // Handle different element types
              if (isInput || isContentEditable) {
                // For input elements, ensure proper focus
                element.focus();
                
                // Clear any existing selection and set cursor position for text inputs
                if ((tagName === 'input' && ['text', 'email', 'password', 'search', 'url', 'tel'].includes(type)) || 
                    tagName === 'textarea') {
                  const inputElement = element as HTMLInputElement | HTMLTextAreaElement;
                  
                  // Calculate cursor position based on click position
                  const rect = element.getBoundingClientRect();
                  const clickPosition = clickX - rect.left;
                  const textWidth = inputElement.value.length * 8; // Approximate character width
                  const cursorPos = Math.min(inputElement.value.length, Math.floor((clickPosition / rect.width) * inputElement.value.length));
                  
                  inputElement.setSelectionRange(cursorPos, cursorPos);
                }
                
                // Trigger focus and input events
                element.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
                element.dispatchEvent(new Event('click', { bubbles: true }));
                
                return {
                  success: true,
                  type: 'input',
                  tagName,
                  inputType: type,
                  focused: document.activeElement === element
                };
              } else {
                // For clickable elements, trigger click event
                element.click();
                
                return {
                  success: true,
                  type: 'click',
                  tagName,
                  href: element.getAttribute('href'),
                  onclick: element.onclick !== null
                };
              }
            } catch (error) {
              return {
                success: false,
                reason: error instanceof Error ? error.message : 'Unknown error',
                tagName,
                type
              };
            }
          }, x, y);
          
          // Also perform physical click for browser handling
          await page.mouse.click(x, y);
          
          console.log(`Click result at ${x}, ${y}:`, clickResult);
          socket.emit("element_clicked", clickResult);
        }
      } catch (error) {
        console.error("Click error:", error);
        socket.emit("click_error", { message: error instanceof Error ? error.message : 'Unknown click error' });
      }
    });



    socket.on("type", async ({ text }: { text: string }) => {
      if (!page) return;
      
      try {
        // Enhanced typing with better focus management
        const typeResult = await page.evaluate((textToType) => {
          const activeElement = document.activeElement as HTMLElement;
          
          // Check if we have a properly focused input
          if (activeElement && 
              (activeElement.tagName.toLowerCase() === 'input' || 
               activeElement.tagName.toLowerCase() === 'textarea' ||
               activeElement.contentEditable === 'true')) {
            
            const inputElement = activeElement as HTMLInputElement | HTMLTextAreaElement;
            
            // For input elements, insert text at cursor position
            if ('selectionStart' in inputElement && 'selectionEnd' in inputElement) {
              const start = inputElement.selectionStart || 0;
              const end = inputElement.selectionEnd || 0;
              const currentValue = inputElement.value;
              
              // Insert text at cursor position
              inputElement.value = currentValue.substring(0, start) + textToType + currentValue.substring(end);
              
              // Update cursor position
              const newCursorPos = start + textToType.length;
              inputElement.setSelectionRange(newCursorPos, newCursorPos);
              
              // Trigger input events
              inputElement.dispatchEvent(new Event('input', { bubbles: true }));
              inputElement.dispatchEvent(new Event('change', { bubbles: true }));
              
              return {
                success: true,
                method: 'direct_insertion',
                element: inputElement.tagName.toLowerCase(),
                value: inputElement.value
              };
            }
            
            return { success: false, reason: 'No selection support' };
          }
          
          // Try to find the best input to focus
          const searchInputs = [
            'input[type="text"]',
            'input[type="search"]', 
            'input[type="email"]',
            'input[type="password"]',
            'input[type="url"]',
            'textarea',
            'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="image"]):not([type="radio"]):not([type="checkbox"])',
            '[contenteditable="true"]'
          ];
          
          for (const selector of searchInputs) {
            const inputs = Array.from(document.querySelectorAll(selector)) as HTMLElement[];
            for (const input of inputs) {
              const rect = input.getBoundingClientRect();
              
              // Check if input is visible and not disabled
              if (rect.width > 0 && rect.height > 0 && 
                  !input.hasAttribute('disabled') && 
                  !input.hasAttribute('readonly') &&
                  input.offsetParent !== null) {
                
                input.focus();
                input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // Wait a moment for focus, then insert text
                setTimeout(() => {
                  if ('value' in input) {
                    (input as HTMLInputElement).value = textToType;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                  } else if (input.contentEditable === 'true') {
                    input.textContent = textToType;
                  }
                }, 50);
                
                return {
                  success: true,
                  method: 'auto_focus',
                  element: input.tagName.toLowerCase(),
                  type: input.getAttribute('type'),
                  selector: selector
                };
              }
            }
          }
          
          return { success: false, reason: 'No suitable input found' };
        }, text);
        
        // If direct insertion failed, use keyboard typing as fallback
        if (!typeResult.success) {
          await page.keyboard.type(text);
          console.log("Typed using keyboard fallback:", text);
        } else {
          console.log("Type result:", typeResult);
        }
        
        socket.emit("type_result", typeResult);
      } catch (error) {
        console.error("Type error:", error);
        socket.emit("type_error", { message: error instanceof Error ? error.message : 'Unknown type error' });
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

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

        // Launch browser with optimized settings and user data persistence
        browser = await puppeteer.launch({ 
          headless: true,
          executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
          userDataDir: './browser-data', // Persist cookies and settings
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
            '--disable-features=VizDisplayCompositor'
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
          
          // Enhanced element detection with better input field recognition
          const elementInfo = await page.evaluate((clickX, clickY) => {
            const element = document.elementFromPoint(clickX, clickY) as HTMLElement;
            if (!element) return { type: 'none' };
            
            const tagName = element.tagName.toLowerCase();
            const role = element.getAttribute('role');
            const className = element.className || '';
            const ariaExpanded = element.getAttribute('aria-expanded');
            const computedStyle = getComputedStyle(element);
            
            // Enhanced input field detection
            if (tagName === 'input' || tagName === 'textarea') {
              const inputType = (element as HTMLInputElement).type || 'text';
              const isTextInput = ['text', 'search', 'email', 'url', 'password', 'tel'].includes(inputType);
              return { 
                type: 'input', 
                tagName,
                inputType,
                isTextInput,
                placeholder: (element as HTMLInputElement).placeholder || '',
                value: (element as HTMLInputElement).value || '',
                disabled: (element as HTMLInputElement).disabled,
                readOnly: (element as HTMLInputElement).readOnly
              };
            }
            
            // Check for contenteditable elements
            if (element.contentEditable === 'true' || element.getAttribute('contenteditable') === 'true') {
              return { type: 'input', tagName: 'contenteditable', isTextInput: true };
            }
            
            // Check for elements that might contain inputs (click through)
            const childInput = element.querySelector('input, textarea');
            if (childInput && !childInput.hasAttribute('disabled')) {
              return { type: 'input_container', tagName, hasChildInput: true };
            }
            
            // Enhanced dropdown detection
            if (tagName === 'select' || 
                role === 'combobox' || 
                role === 'listbox' ||
                className.includes('dropdown') ||
                className.includes('select') ||
                ariaExpanded !== null ||
                element.getAttribute('data-toggle') === 'dropdown') {
              return { type: 'dropdown', tagName, role, className };
            }
            
            // Enhanced clickable element detection
            const isClickable = tagName === 'button' || 
                              tagName === 'a' ||
                              role === 'button' ||
                              role === 'link' ||
                              element.onclick ||
                              className.includes('btn') ||
                              className.includes('button') ||
                              className.includes('clickable') ||
                              computedStyle.cursor === 'pointer' ||
                              element.hasAttribute('onclick');
            
            if (isClickable) {
              return { type: 'button', tagName, role, text: element.textContent?.trim() || '' };
            }
            
            // Check for form elements
            if (element.closest('form')) {
              return { type: 'form_element', tagName };
            }
            
            return { type: 'generic', tagName, className };
          }, x, y);
          
          // Handle different element types with appropriate interactions
          switch (elementInfo.type) {
            case 'input':
            case 'input_container':
              // Enhanced input focusing with multiple attempts
              await page.mouse.click(x, y);
              await new Promise(resolve => setTimeout(resolve, 150));
              
              const inputResult = await page.evaluate((clickX, clickY) => {
                let targetElement = document.elementFromPoint(clickX, clickY) as HTMLElement;
                
                // If it's a container, find the actual input
                if (targetElement && !['INPUT', 'TEXTAREA'].includes(targetElement.tagName)) {
                  const childInput = targetElement.querySelector('input:not([disabled]):not([type="hidden"]), textarea:not([disabled])') as HTMLInputElement;
                  if (childInput) {
                    targetElement = childInput;
                  }
                }
                
                if (targetElement && (targetElement.tagName === 'INPUT' || targetElement.tagName === 'TEXTAREA')) {
                  const inputElement = targetElement as HTMLInputElement;
                  
                  // Clear any existing focus
                  if (document.activeElement && document.activeElement !== inputElement) {
                    (document.activeElement as HTMLElement).blur();
                  }
                  
                  // Focus with multiple methods
                  inputElement.focus();
                  inputElement.click();
                  
                  // Dispatch events to ensure proper activation
                  inputElement.dispatchEvent(new Event('mousedown', { bubbles: true }));
                  inputElement.dispatchEvent(new Event('mouseup', { bubbles: true }));
                  inputElement.dispatchEvent(new Event('click', { bubbles: true }));
                  inputElement.dispatchEvent(new Event('focus', { bubbles: true }));
                  inputElement.dispatchEvent(new Event('focusin', { bubbles: true }));
                  
                  // Position cursor at end for text inputs
                  const isTextInput = inputElement.tagName === 'TEXTAREA' || 
                                    ['text', 'search', 'email', 'url', 'password', 'tel'].includes(inputElement.type);
                  
                  if (isTextInput) {
                    setTimeout(() => {
                      try {
                        inputElement.setSelectionRange(inputElement.value.length, inputElement.value.length);
                      } catch (e) {
                        // Fallback
                      }
                    }, 10);
                  }
                  
                  return { 
                    success: true, 
                    focused: document.activeElement === inputElement,
                    value: inputElement.value,
                    type: inputElement.type,
                    placeholder: inputElement.placeholder,
                    tagName: inputElement.tagName,
                    id: inputElement.id,
                    name: inputElement.name
                  };
                }
                
                // Handle contenteditable
                if (targetElement && targetElement.contentEditable === 'true') {
                  targetElement.focus();
                  targetElement.click();
                  return { 
                    success: true, 
                    focused: document.activeElement === targetElement,
                    tagName: 'contenteditable',
                    type: 'contenteditable'
                  };
                }
                
                return { success: false, element: targetElement?.tagName || 'none' };
              }, x, y);
              
              // Double-click for stubborn inputs
              if (!inputResult.success) {
                await page.mouse.click(x, y, { clickCount: 2 });
                await new Promise(resolve => setTimeout(resolve, 100));
              }
              
              socket.emit("element_interacted", { 
                type: 'input', 
                success: inputResult.success, 
                details: inputResult 
              });
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
        
        // Enhanced input detection and focusing
        const focusedElement = await page.evaluate(() => {
          const activeElement = document.activeElement as HTMLElement;
          
          // Check if we already have a focused input
          if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
            const input = activeElement as HTMLInputElement;
            return {
              tagName: input.tagName,
              type: input.type || 'text',
              value: input.value || '',
              placeholder: input.placeholder || '',
              focused: true
            };
          }
          
          // Look for the most likely input to type into
          const inputSelectors = [
            'input[type="search"]:not([disabled])',
            'input[type="text"]:not([disabled])',
            'input[placeholder*="search" i]:not([disabled])',
            'input[placeholder*="Search" i]:not([disabled])',
            'textarea:not([disabled])',
            'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]):not([disabled])'
          ];
          
          for (const selector of inputSelectors) {
            const inputs = Array.from(document.querySelectorAll(selector)) as HTMLInputElement[];
            for (const element of inputs) {
              const rect = element.getBoundingClientRect();
              const style = getComputedStyle(element);
              
              if (rect.width > 0 && rect.height > 0 && 
                  style.visibility !== 'hidden' && 
                  style.display !== 'none' &&
                  !element.readOnly) {
                
                // Force focus with multiple methods
                element.focus();
                element.click();
                element.dispatchEvent(new Event('focus', { bubbles: true }));
                element.dispatchEvent(new Event('click', { bubbles: true }));
                
                return {
                  tagName: element.tagName,
                  type: element.type || 'text',
                  value: element.value || '',
                  placeholder: element.placeholder || '',
                  focused: document.activeElement === element,
                  selector: selector
                };
              }
            }
          }
          
          return null;
        });
        
        if (focusedElement) {
          // For single character typing, just append - don't replace
          if (text.length === 1) {
            // Simply type the character without selecting all
            await page.keyboard.type(text, { delay: 50 });
          } else {
            // For longer text, check if we should replace all or append
            const shouldReplaceAll = focusedElement.type === 'search' && 
                                   focusedElement.placeholder.toLowerCase().includes('search');
            
            if (shouldReplaceAll && focusedElement.value.length > 0) {
              // Only select all for search inputs that already have content
              await page.keyboard.down('ControlLeft');
              await page.keyboard.press('KeyA');
              await page.keyboard.up('ControlLeft');
              await new Promise(resolve => setTimeout(resolve, 30));
            }
            
            // Type the text
            await page.keyboard.type(text, { delay: 50 });
          }
          
          socket.emit("text_typed", { 
            success: true, 
            elementType: focusedElement.tagName,
            inputType: focusedElement.type,
            textLength: text.length
          });
        } else {
          // Try to type anyway
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
          const scrollableElements = Array.from(document.querySelectorAll('*'));
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
          // First try to focus the most recently clicked element if it's an input
          const activeElement = document.activeElement as HTMLElement;
          if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
            activeElement.focus();
            return { 
              success: true, 
              tagName: activeElement.tagName.toLowerCase(),
              type: (activeElement as HTMLInputElement).type,
              value: (activeElement as HTMLInputElement).value,
              alreadyFocused: true 
            };
          }
          
          // Otherwise find and focus the first visible input
          const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea'));
          for (const input of inputs) {
            const element = input as HTMLInputElement;
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            
            if (rect.width > 0 && rect.height > 0 && 
                !element.disabled && 
                style.visibility !== 'hidden' && 
                style.display !== 'none') {
              element.focus();
              element.click(); // Ensure click event fires
              return { 
                success: true, 
                tagName: element.tagName.toLowerCase(),
                type: element.type,
                value: element.value,
                placeholder: element.placeholder 
              };
            }
          }
          return { success: false, reason: "No focusable input found" };
        });
        
        socket.emit("input_focused", focused);
        console.log("Focus input result:", focused);
      } catch (error) {
        console.error("Focus input error:", error);
        socket.emit("input_focused", { success: false, error: String(error) });
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

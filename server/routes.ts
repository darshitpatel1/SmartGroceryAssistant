import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import puppeteer, { type Browser, type Page, type CDPSession } from "puppeteer";
import { AIShoppingAssistant, ShoppingItem } from './ai-shopping';

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
    let aiAssistant: AIShoppingAssistant | null = null;

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
        
        // Enhanced popup handling and input focusing for better user experience
        await page.evaluateOnNewDocument(() => {
          // More aggressive popup and cookie consent handling
          const autoClickPopups = () => {
            // Enhanced cookie consent detection
            const cookieSelectors = [
              'button:contains("Accept All")',
              'button:contains("Accept all")', 
              'button:contains("ACCEPT ALL")',
              '[data-testid*="accept"]',
              '[id*="accept"]',
              '[class*="accept"]',
              'button[aria-label*="accept" i]'
            ];
            
            // Try multiple methods to find and click accept buttons
            const acceptButtons = document.querySelectorAll('button, [role="button"], a');
            acceptButtons.forEach(btn => {
              const element = btn as HTMLElement;
              const text = element.textContent?.toLowerCase().trim() || '';
              const ariaLabel = element.getAttribute('aria-label')?.toLowerCase() || '';
              const id = element.id?.toLowerCase() || '';
              const className = element.className?.toLowerCase() || '';
              
              if ((text.includes('accept all') || text.includes('accept') || 
                   ariaLabel.includes('accept') || id.includes('accept') || 
                   className.includes('accept')) && 
                  element.offsetParent !== null) { // Check if visible
                console.log('Auto-clicking Accept button:', text || ariaLabel || id);
                element.click();
                element.dispatchEvent(new Event('click', { bubbles: true }));
              }
            });
            
            // Remove overlays and modals that block interaction
            const overlaySelectors = [
              '[class*="overlay"]', '[class*="modal"]', '[class*="popup"]',
              '[style*="position: fixed"]', '[style*="z-index"]',
              '[data-testid*="overlay"]', '[data-testid*="modal"]'
            ];
            
            overlaySelectors.forEach(selector => {
              const elements = document.querySelectorAll(selector);
              elements.forEach(el => {
                const element = el as HTMLElement;
                const style = getComputedStyle(element);
                if (style.position === 'fixed' && parseInt(style.zIndex) > 100) {
                  const text = element.textContent?.toLowerCase() || '';
                  if (text.includes('cookie') || text.includes('accept') || text.includes('consent') ||
                      text.includes('privacy') || text.includes('gdpr')) {
                    console.log('Removing blocking overlay');
                    element.remove();
                  }
                }
              });
            });
          };
          
          // Enhanced input focusing with better event handling
          const setupInputFocusing = () => {
            document.addEventListener('click', (e) => {
              const target = e.target as HTMLElement;
              
              // Check if clicked element is or contains an input
              let inputElement = null;
              if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                inputElement = target as HTMLInputElement;
              } else {
                inputElement = target.querySelector('input, textarea') as HTMLInputElement;
              }
              
              if (inputElement && !inputElement.disabled && !inputElement.readOnly) {
                setTimeout(() => {
                  inputElement.focus();
                  inputElement.click();
                  
                  // Dispatch focus events
                  inputElement.dispatchEvent(new Event('focus', { bubbles: true }));
                  inputElement.dispatchEvent(new Event('focusin', { bubbles: true }));
                  
                  console.log('Auto-focused input:', inputElement.placeholder || inputElement.name || inputElement.id);
                }, 50);
              }
            });
          };
          
          // Run all setups
          setTimeout(autoClickPopups, 500);
          setTimeout(autoClickPopups, 2000);
          setTimeout(autoClickPopups, 5000);
          setTimeout(setupInputFocusing, 100);
          
          // Setup mutation observer for dynamic content
          document.addEventListener('DOMContentLoaded', () => {
            setupInputFocusing();
            autoClickPopups();
            
            const observer = new MutationObserver(() => {
              autoClickPopups();
            });
            observer.observe(document.body, { childList: true, subtree: true });
          });
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
        
        // Comprehensive popup removal and cookie acceptance for Flipp.com
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // First, try to click Accept All button before removing
        const acceptClicked = await page.evaluate(() => {
          // Look for "Accept All" button specifically
          const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
          for (const btn of buttons) {
            const element = btn as HTMLElement;
            const text = element.textContent?.trim().toLowerCase() || '';
            const ariaLabel = element.getAttribute('aria-label')?.toLowerCase() || '';
            
            if ((text === 'accept all' || text === 'accept all cookies' || 
                 ariaLabel.includes('accept all') || 
                 element.innerText?.trim().toLowerCase() === 'accept all') &&
                element.offsetParent !== null) {
              console.log('Clicking Accept All button:', text || ariaLabel);
              element.click();
              element.dispatchEvent(new Event('click', { bubbles: true }));
              
              // Also dispatch mouse events for stubborn handlers
              element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
              element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
              return true;
            }
          }
          return false;
        });
        
        // Wait a moment for the click to process
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Then remove any remaining cookie banners/overlays
        await page.evaluate(() => {
          // Specific selectors for cookie/privacy banners
          const cookieSelectors = [
            '[data-testid*="cookie"]',
            '[data-testid*="consent"]',
            '[data-testid*="privacy"]',
            '[class*="cookie"]',
            '[class*="consent"]',
            '[class*="privacy"]',
            '[id*="cookie"]',
            '[id*="consent"]',
            '[id*="privacy"]',
            'div[style*="position: fixed"][style*="z-index"]',
            '[role="dialog"]',
            '[role="banner"]'
          ];
          
          cookieSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
              const element = el as HTMLElement;
              const text = element.textContent?.toLowerCase() || '';
              if (text.includes('accept') || text.includes('cookie') || 
                  text.includes('consent') || text.includes('privacy') ||
                  text.includes('we value your privacy')) {
                console.log('Removing cookie banner:', selector);
                element.style.display = 'none';
                element.remove();
              }
            });
          });
          
          // Remove any high z-index fixed position overlays
          const allElements = document.querySelectorAll('*');
          allElements.forEach(el => {
            const element = el as HTMLElement;
            const style = getComputedStyle(element);
            if (style.position === 'fixed' && 
                parseInt(style.zIndex) > 100 &&
                element.offsetHeight > 50) {
              const text = element.textContent?.toLowerCase() || '';
              if (text.includes('cookie') || text.includes('accept') || 
                  text.includes('consent') || text.includes('privacy') ||
                  text.includes('we value your privacy')) {
                console.log('Removing blocking overlay');
                element.style.display = 'none';
                element.remove();
              }
            }
          });
        });
        
        console.log('Cookie consent handling completed, accepted:', acceptClicked);
        
        // Set cookie consent directly to prevent future popups
        await page.evaluate(() => {
          // Set common cookie consent values that websites check for
          const consentValues = [
            'cookie_consent=accepted',
            'cookies_accepted=true',
            'gdpr_consent=true',
            'privacy_consent=accepted',
            'cookie_banner_dismissed=true',
            'flipp_cookie_consent=accepted'
          ];
          
          consentValues.forEach(cookieStr => {
            const [name, value] = cookieStr.split('=');
            document.cookie = `${name}=${value}; path=/; max-age=31536000; SameSite=Lax`;
          });
          
          // Also set in localStorage for good measure
          try {
            localStorage.setItem('cookie_consent', 'accepted');
            localStorage.setItem('privacy_consent', 'accepted');
            localStorage.setItem('gdpr_consent', 'true');
            localStorage.setItem('cookieConsent', 'accepted');
          } catch (e) {
            // Storage might not be available
          }
          
          console.log('Set cookie consent flags to prevent future popups');
        });
        
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
          // Ensure coordinates are properly bounded
          const boundedXNorm = Math.max(0, Math.min(1, xNorm));
          const boundedYNorm = Math.max(0, Math.min(1, yNorm));
          
          const x = Math.round(boundedXNorm * viewport.width);
          const y = Math.round(boundedYNorm * viewport.height);
          
          console.log(`Clicking at: ${x}, ${y} (normalized: ${boundedXNorm}, ${boundedYNorm})`);
          
          // Get accurate page dimensions for coordinate mapping
          const pageInfo = await page.evaluate(() => {
            return {
              documentWidth: document.documentElement.scrollWidth,
              documentHeight: document.documentElement.scrollHeight,
              viewportWidth: window.innerWidth,
              viewportHeight: window.innerHeight,
              scrollX: window.scrollX,
              scrollY: window.scrollY
            };
          });
          
          // Adjust coordinates for any scaling difference
          const scaleX = pageInfo.viewportWidth / viewport.width;
          const scaleY = pageInfo.viewportHeight / viewport.height;
          
          const adjustedX = Math.round(x * scaleX) + pageInfo.scrollX;
          const adjustedY = Math.round(y * scaleY) + pageInfo.scrollY;
          
          console.log(`Adjusted coordinates: ${adjustedX}, ${adjustedY} (scale: ${scaleX}, ${scaleY})`);
          
          // Use the properly scaled coordinates for element detection
          const finalX = adjustedX;
          const finalY = adjustedY;
          
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
          }, finalX, finalY);
          
          // Handle different element types with appropriate interactions
          switch (elementInfo.type) {
            case 'input':
            case 'input_container':
              // Enhanced input focusing with multiple attempts using corrected coordinates
              await page.mouse.click(finalX, finalY);
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
              }, finalX, finalY);
              
              // Double-click for stubborn inputs
              if (!inputResult.success) {
                await page.mouse.click(finalX, finalY, { clickCount: 2 });
                await new Promise(resolve => setTimeout(resolve, 100));
              }
              
              socket.emit("element_interacted", { 
                type: 'input', 
                success: inputResult.success, 
                details: inputResult 
              });
              break;
              
            case 'dropdown':
              // For dropdowns, try multiple interaction methods with corrected coordinates
              await page.mouse.click(finalX, finalY);
              await new Promise(resolve => setTimeout(resolve, 200));
              
              // Check if dropdown opened, if not try hover + click
              const dropdownOpened = await page.evaluate(() => {
                const openDropdowns = document.querySelectorAll('[aria-expanded="true"], .open, .active, [class*="open"]');
                return openDropdowns.length > 0;
              });
              
              if (!dropdownOpened) {
                await page.mouse.move(finalX, finalY);
                await new Promise(resolve => setTimeout(resolve, 100));
                await page.mouse.click(finalX, finalY);
              }
              
              socket.emit("element_interacted", { type: 'dropdown', success: true });
              break;
              
            case 'button':
              // For buttons, simple click with small delay using corrected coordinates
              await page.mouse.click(finalX, finalY);
              await new Promise(resolve => setTimeout(resolve, 150));
              socket.emit("element_interacted", { type: 'button', success: true });
              break;
              
            default:
              // Generic click for other elements using corrected coordinates
              await page.mouse.click(finalX, finalY);
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

    // Helper function to perform Flipp search and analysis
    async function performFlippSearch(item: string, postalCode: string) {
      if (!page || !browser || !aiAssistant) {
        console.log("performFlippSearch: Missing dependencies", {
          page: !!page,
          browser: !!browser, 
          aiAssistant: !!aiAssistant
        });
        return;
      }

      try {
        // Build the Flipp URL
        const flippUrl = `https://flipp.com/search/${encodeURIComponent(item)}?postal_code=${postalCode}`;
        console.log("performFlippSearch: Starting search for", item, "at", flippUrl);
        
        // Notify user that we're navigating to Flipp
        socket.emit("ai_response", { 
          message: `🔍 Navigating to Flipp.com to search for "${item}"...`, 
          type: 'info' 
        });

        // Navigate to Flipp URL (this will show in the browser viewport)
        socket.emit("loading", { status: "starting" });
        
        console.log("performFlippSearch: About to navigate to", flippUrl);
        
        // Navigate with proper event handling
        await page.goto(flippUrl, { 
          waitUntil: 'networkidle2',
          timeout: 30000 
        });
        
        console.log("performFlippSearch: Navigation completed to", page.url());

        // Get navigation state and emit proper events
        const canGoBack = await page.evaluate(() => window.history.length > 1);
        const currentUrl = page.url();
        
        // Emit all navigation events that the frontend expects
        socket.emit("url_update", { url: currentUrl });
        socket.emit("navigation_complete", { 
          url: currentUrl, 
          canGoBack, 
          canGoForward: false 
        });
        socket.emit("url_changed", { 
          url: currentUrl, 
          canGoBack, 
          canGoForward: false 
        });
        socket.emit("loading", { status: "complete" });

        // Wait for page to load and content to appear
        socket.emit("ai_response", { 
          message: `📄 Page loaded, waiting for search results to appear...`, 
          type: 'info' 
        });
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Take screenshot for AI analysis
        socket.emit("ai_response", { 
          message: `📸 Taking screenshot for AI analysis...`, 
          type: 'info' 
        });
        
        const screenshot = await page.screenshot({ 
          encoding: 'base64',
          type: 'jpeg',
          quality: 80
        });

        // Notify AI analysis start
        socket.emit("ai_response", { 
          message: `🤖 Analyzing prices with AI...`, 
          type: 'info' 
        });

        // Use AI to analyze the screenshot
        const analysis = await aiAssistant.analyzeFlippScreenshots(
          item,
          [screenshot as string]
        );

        // Send deal information back to client
        if (analysis.analyses && analysis.analyses.length > 0) {
          const bestDeal = analysis.analyses[0];
          socket.emit("deal_found", {
            item: bestDeal.item,
            cheapestStore: bestDeal.cheapestStore,
            price: bestDeal.price,
            savings: bestDeal.savings,
            points: bestDeal.points,
            confidence: bestDeal.confidence
          });
        } else {
          socket.emit("ai_response", { 
            message: `No clear price information found for ${item}. The store might be out of stock or the page didn't load properly.`, 
            type: 'info' 
          });
        }

      } catch (error) {
        console.error("Flipp search error for", item, ":", error);
        socket.emit("search_error", { 
          message: `Sorry, I had trouble searching for ${item}. Please try again.` 
        });
      }
    }

    // Store conversation history for context
    let conversationHistory: Array<{role: 'user' | 'assistant', content: string}> = [];

    // AI Shopping Assistant Events
    socket.on("ai_chat", async ({ message, type }: { message: string; type?: 'start' | 'message' }) => {
      try {
        if (!aiAssistant) {
          aiAssistant = new AIShoppingAssistant();
        }

        // Initialize browser if it doesn't exist
        if (!browser || !page) {
          console.log("AI Chat: Initializing browser for the first time");
          
          try {
            // Launch browser with optimized settings
            browser = await puppeteer.launch({ 
              headless: true,
              executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
              userDataDir: './browser-data',
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
            
            // Set up frame streaming for AI-initialized browser
            const client = await page.target().createCDPSession();
            await client.send('Page.enable');
            await client.send('Page.startScreencast', {
              format: 'jpeg',
              quality: 80,
              maxWidth: 1280,
              maxHeight: 720,
              everyNthFrame: 1
            });

            client.on('Page.screencastFrame', async ({ data, metadata }) => {
              socket.emit('frame', data);
              await client.send('Page.screencastFrameAck', { sessionId: metadata.sessionId });
            });
            
            console.log("AI Chat: Browser initialized successfully with frame streaming");
          } catch (error) {
            console.error("AI Chat: Failed to initialize browser:", error);
            socket.emit("ai_response", { 
              message: "Browser initialization failed. Please try again.", 
              type: 'error' 
            });
            return;
          }
        }

        // Add user message to conversation history
        conversationHistory.push({ role: 'user', content: message });
        
        // Keep only last 5 exchanges (10 messages total)
        if (conversationHistory.length > 10) {
          conversationHistory = conversationHistory.slice(-10);
        }

        // Extract postal code and shopping items from message
        const postalCode = aiAssistant.extractPostalCode(message);
        const shoppingItems = aiAssistant.parseShoppingList(message);
        
        console.log(`AI Chat Debug - Message: "${message}"`);
        console.log(`AI Chat Debug - Extracted postal code: "${postalCode}"`);
        console.log(`AI Chat Debug - Found ${shoppingItems.length} items:`, shoppingItems.map(item => item.name));
        
        if (postalCode && shoppingItems.length > 0) {
          // User provided both postal code and items - start automatic search
          const responseMsg = `Great! I detected postal code ${postalCode} and ${shoppingItems.length} item(s). Let me find the best prices for you...`;
          conversationHistory.push({ role: 'assistant', content: responseMsg });
          
          socket.emit("ai_response", { 
            message: responseMsg, 
            type: 'info' 
          });

          // Start the price search workflow
          for (let i = 0; i < shoppingItems.length; i++) {
            const item = shoppingItems[i];
            socket.emit("price_update", { 
              item: item.name, 
              current: i + 1, 
              total: shoppingItems.length 
            });

            await performFlippSearch(item.name, postalCode);
            
            // Small delay between searches
            if (i < shoppingItems.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
          
          const completionMsg = `Price search complete! I found deals for ${shoppingItems.length} item(s).`;
          conversationHistory.push({ role: 'assistant', content: completionMsg });
          
          socket.emit("search_complete", { 
            summary: completionMsg,
            nextSteps: "Feel free to ask me about specific stores or if you need prices for more items."
          });
          
        } else if (postalCode) {
          const responseMsg = `Perfect! I have your postal code: ${postalCode}. Now please tell me what items you're looking for (like "milk", "bread", "eggs").`;
          conversationHistory.push({ role: 'assistant', content: responseMsg });
          
          socket.emit("ai_response", { 
            message: responseMsg, 
            type: 'info' 
          });
        } else if (shoppingItems.length > 0) {
          const responseMsg = `I see you want: ${shoppingItems.map(item => item.name).join(', ')}. Could you also provide your postal code so I can find local store prices?`;
          conversationHistory.push({ role: 'assistant', content: responseMsg });
          
          socket.emit("ai_response", { 
            message: responseMsg, 
            type: 'info' 
          });
        } else {
          // Regular AI response for general questions with conversation context
          let response: string;
          if (type === 'start') {
            response = await aiAssistant.startShoppingSession();
          } else {
            // Add context from conversation history
            const contextMessage = conversationHistory.length > 0 
              ? `Previous conversation context (last 5 messages for reference only): ${JSON.stringify(conversationHistory.slice(-5))}\n\nCurrent question: ${message}`
              : message;
            response = await aiAssistant.processUserMessage(contextMessage);
          }
          
          conversationHistory.push({ role: 'assistant', content: response });
          socket.emit("ai_response", { message: response, type: 'info' });
        }

      } catch (error) {
        console.error("AI chat error:", error);
        const errorMsg = "I'm having trouble right now. Please try again.";
        conversationHistory.push({ role: 'assistant', content: errorMsg });
        
        socket.emit("ai_response", { 
          message: errorMsg, 
          type: 'error' 
        });
      }
    });

    socket.on("start_price_search", async ({ item, postalCode }: { item: string; postalCode: string }) => {
      try {
        if (!page || !browser) {
          socket.emit("ai_response", { 
            response: "Browser not ready. Please wait for connection.", 
            type: 'error' 
          });
          return;
        }

        socket.emit("ai_response", { 
          response: `Starting price search for "${item}" in area ${postalCode}...`, 
          type: 'info' 
        });

        // Navigate to Flipp.com with the search
        const flippUrl = `https://flipp.com/search/${encodeURIComponent(item)}?postal_code=${postalCode}`;
        console.log("Navigating to Flipp URL:", flippUrl);
        
        await page.goto(flippUrl, { 
          waitUntil: 'networkidle2',
          timeout: 30000 
        });

        // Wait for page to load completely
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Take initial screenshot
        const screenshot1 = await page.screenshot({ 
          encoding: 'base64',
          fullPage: false,
          type: 'jpeg',
          quality: 80
        });

        // Scroll down and take another screenshot
        await page.evaluate(() => {
          window.scrollBy(0, window.innerHeight);
        });
        await new Promise(resolve => setTimeout(resolve, 2000));

        const screenshot2 = await page.screenshot({ 
          encoding: 'base64',
          fullPage: false,
          type: 'jpeg',
          quality: 80
        });

        socket.emit("ai_response", { 
          response: "Screenshots captured! Analyzing prices...", 
          type: 'info' 
        });

        // Analyze screenshots with AI
        if (aiAssistant) {
          const analysis = await aiAssistant.analyzeFlippScreenshots(item, [screenshot1, screenshot2]);
          
          socket.emit("ai_response", { 
            response: analysis.summary, 
            type: 'analysis',
            data: analysis
          });

          if (analysis.analyses.length > 0) {
            const bestDeal = analysis.analyses[0];
            socket.emit("ai_response", { 
              response: `Best deal found: ${bestDeal.item} at ${bestDeal.cheapestStore} for ${bestDeal.price}${bestDeal.savings ? ` (${bestDeal.savings})` : ''}`, 
              type: 'deal',
              data: bestDeal
            });
          }
        }

      } catch (error) {
        console.error("Price search error:", error);
        socket.emit("ai_response", { 
          response: "Error during price search. Please try again.", 
          type: 'error' 
        });
      }
    });

    socket.on("process_shopping_list", async ({ items, postalCode }: { items: string[]; postalCode: string }) => {
      try {
        if (!aiAssistant) {
          aiAssistant = new AIShoppingAssistant();
        }

        socket.emit("ai_response", { 
          response: `Processing shopping list of ${items.length} items for postal code ${postalCode}...`, 
          type: 'info' 
        });

        const results = [];
        
        for (let i = 0; i < items.length; i++) {
          const item = items[i].trim();
          if (!item) continue;

          socket.emit("ai_response", { 
            response: `Searching for item ${i + 1}/${items.length}: ${item}`, 
            type: 'progress',
            data: { current: i + 1, total: items.length, item }
          });

          // Trigger price search for this item
          socket.emit("start_price_search", { item, postalCode });
          
          // Wait between searches to avoid overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 5000));
        }

        socket.emit("ai_response", { 
          response: "Shopping list analysis complete! Check the results above.", 
          type: 'complete' 
        });

      } catch (error) {
        console.error("Shopping list processing error:", error);
        socket.emit("ai_response", { 
          response: "Error processing shopping list. Please try again.", 
          type: 'error' 
        });
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

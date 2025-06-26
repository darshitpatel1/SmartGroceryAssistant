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
    
    const browserManager = new BrowserManager(socket);

    socket.on("browse", async ({ url }: { url: string }) => {
      await browserManager.navigate(url);
    });

    socket.on("click", async ({ xNorm, yNorm }: { xNorm: number; yNorm: number }) => {
      await browserManager.click(xNorm, yNorm);
    });

    socket.on("type", async ({ text }: { text: string }) => {
      await browserManager.type(text);
    });

    socket.on("scroll", async ({ deltaY }: { deltaY: number }) => {
      await browserManager.scroll(deltaY);
    });

    socket.on("key", async ({ key, modifiers }: { key: string; modifiers?: string[] }) => {
      await browserManager.pressKey(key, modifiers);
    });

    socket.on("zoom", async ({ level }: { level: number }) => {
      await browserManager.zoom(level);
    });

    socket.on("navigate", async ({ direction }: { direction: 'back' | 'forward' | 'refresh' }) => {
      await browserManager.navigate_direction(direction);
    });

    socket.on("focus_input", async () => {
      await browserManager.focusInput();
    });

    socket.on("double_click", async ({ xNorm, yNorm }: { xNorm: number; yNorm: number }) => {
      await browserManager.doubleClick(xNorm, yNorm);
    });

    socket.on("disconnect", async () => {
      console.log("Client disconnected:", socket.id);
      await browserManager.cleanup();
    });
  });

  return httpServer;
}

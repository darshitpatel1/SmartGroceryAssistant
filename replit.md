# In-Page Browser

## Overview

This project is a real-time web browser interface that allows users to control a headless browser through a web application. The system consists of a React frontend and an Express backend that uses Puppeteer to control a headless Chrome instance. Users can navigate to websites, view live screenshots, and interact with pages through clicking and typing.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom browser-themed variables
- **State Management**: React hooks with Socket.IO client for real-time communication
- **Routing**: Wouter for lightweight client-side routing

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js for HTTP server
- **Real-time Communication**: Socket.IO for bidirectional communication
- **Browser Automation**: Puppeteer for headless Chrome control
- **Database**: Drizzle ORM configured for PostgreSQL (schema defined but not actively used)

## Key Components

### Frontend Components
1. **BrowserViewport**: Displays live browser screenshots and handles click interactions
2. **ControlsSidebar**: Provides text input controls for typing into the browser
3. **Browser Page**: Main application interface combining viewport and controls
4. **Socket Hook**: Custom hook managing WebSocket connection and browser commands

### Backend Services
1. **Socket.IO Server**: Handles real-time communication between client and browser
2. **Puppeteer Integration**: Manages headless Chrome instances and screen capture
3. **CDP (Chrome DevTools Protocol)**: Enables live screencasting functionality
4. **Express Server**: Serves static files and handles HTTP requests

### Database Schema
- **Users Table**: Basic user model with username/password (currently using in-memory storage)
- **Drizzle ORM**: Configured for PostgreSQL with type-safe schema definitions

## Data Flow

1. **Browser Navigation**: User enters URL → Frontend emits 'browse' event → Backend launches Puppeteer → Page loads and starts screencasting
2. **Live View**: Puppeteer captures frames via CDP → Backend emits 'frame' events → Frontend displays base64-encoded JPEG images
3. **User Interaction**: User clicks on viewport → Frontend calculates normalized coordinates → Backend translates to page coordinates and simulates mouse click
4. **Text Input**: User types in sidebar → Frontend emits 'type' event → Backend uses Puppeteer keyboard API to input text

## External Dependencies

### Production Dependencies
- **@neondatabase/serverless**: Neon database driver
- **drizzle-orm**: Type-safe ORM
- **express**: Web framework
- **socket.io**: Real-time communication
- **puppeteer**: Browser automation
- **react**: UI framework
- **@tanstack/react-query**: Data fetching and caching
- **@radix-ui/***: Accessible UI components
- **tailwindcss**: Utility-first CSS framework

### Development Dependencies
- **tsx**: TypeScript execution
- **vite**: Build tool and dev server
- **typescript**: Type checking
- **esbuild**: Fast bundling for production

## Deployment Strategy

### Development Environment
- **Command**: `npm run dev`
- **Process**: Runs Express server with Socket.IO and serves Vite dev server
- **Port**: 5000 (configured in .replit)
- **Hot Reload**: Enabled for both frontend and backend

### Production Build
- **Build Command**: `npm run build`
- **Process**: 
  1. Vite builds React app to `dist/public`
  2. esbuild bundles server code to `dist/index.js`
- **Start Command**: `npm run start`
- **Deployment**: Configured for Replit autoscale deployment

### Database Setup
- **Environment**: Requires `DATABASE_URL` environment variable
- **Migration**: Use `npm run db:push` to push schema changes
- **Provider**: Configured for PostgreSQL via Neon or similar

## Changelog
- June 25, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.
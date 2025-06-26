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
- June 26, 2025. Enhanced browser interaction system with native click handling, fixed input typing system, and proper dropdown support
- June 26, 2025. Added navigation sidebar and AI chatbot integration
- June 26, 2025. Fixed input focusing issues and character-by-character typing behavior
- June 26, 2025. Added cookie persistence and comprehensive input interaction improvements

## Recent Changes

### AI Shopping Assistant Integration (June 26, 2025)
- **AI-Powered Price Comparison**: Full OpenAI integration for intelligent price analysis using GPT-4o model
- **Flipp.com Automation**: Automated browser navigation to search products and capture screenshots
- **Smart Price Analysis**: AI analyzes product screenshots to identify cheapest prices across stores (Metro, Fortinos, Loblaws)
- **Shopping List Processing**: Batch processing of multiple items with postal code-based location targeting
- **Enhanced Chatbot UI**: Shopping mode interface with postal code input, shopping list textarea, and quick action buttons
- **Real-time Progress Tracking**: Visual progress indicators and specialized message types for deals, analysis, and search status
- **Screenshot Analysis**: Automated screenshot capture and AI-powered price extraction from Flipp.com search results

### Navigation and Chatbot Integration (June 26, 2025)
- **Added Navigation Sidebar**: Left sidebar with collapsible navigation including Home, Browser, and Settings pages
- **Integrated AI Chatbot**: Right-side chatbot interface in browser view with messaging capabilities
- **New Page Structure**: Created Home page with feature overview and Settings page with configuration options
- **Consistent Theme**: Applied browser theme colors throughout all components for unified appearance
- **Responsive Layout**: Three-panel layout with sidebar, main content, and chatbot panel

### Enhanced Browser Interaction System (June 26, 2025)
- **Fixed Input Typing**: Characters now append properly instead of overwriting, eliminating the "shaking" behavior
- **Smart Click Detection**: System detects dropdowns, inputs, and normal elements for appropriate handling
- **Dropdown Support**: Added hover, timing delays, and double-click handling for dropdowns that require multiple interactions
- **Native Loading Indicators**: Browser-style loading progress bar at top of viewport
- **Removed Unnecessary UI**: Eliminated focus and send buttons per user request
- **Cursor Positioning**: Proper cursor placement in input fields at click position or end of text

### Latest Browser Interaction Fixes (June 26, 2025)
- **Improved Input Focusing**: Clicks on input fields now properly trigger focus with event dispatching
- **Natural Character Typing**: Single characters append naturally without text replacement behavior
- **URL Bar Editing**: Fixed URL bar to be fully editable with proper text selection on focus
- **Keyboard Input Control**: Prevented global key capture when typing in app's own input fields
- **Removed Focus Button**: Eliminated manual focus button as requested by user
- **Enhanced Type Detection**: Better detection of when to replace vs. append text based on input type

### Cookie Persistence and Advanced Input Handling (June 26, 2025)
- **Cookie Persistence**: Added userDataDir to Puppeteer for persistent cookies and browser settings
- **Enhanced Input Detection**: Improved recognition of input containers, contenteditable elements, and nested inputs
- **Multi-Method Focusing**: Multiple event dispatching and focusing techniques for stubborn input fields
- **Smart Input Finding**: Priority-based input selection for typing (search inputs first, then text inputs)
- **Comprehensive Event Handling**: Mousedown, mouseup, click, focus, and focusin events for maximum compatibility
- **Input Container Support**: Clicks on elements containing inputs now properly focus the child input

### Technical Implementation
- Added AppSidebar component with navigation and collapsible functionality
- Created Chatbot component with message history, typing indicators, and minimization
- Updated main App.tsx layout to use three-panel structure (sidebar + main + chatbot)
- Created Home and Settings pages with feature descriptions and configuration options
- Applied consistent browser theme styling across all new components
- Replaced BrowserManager class with inline Puppeteer integration in routes.ts
- Enhanced click handler with element type detection and appropriate timing
- Fixed typing system to use cursor position and text insertion instead of value replacement
- Added proper delays for dropdown interactions to handle lag issues
- Implemented loading status tracking with real browser-like indicators

## User Preferences

Preferred communication style: Simple, everyday language.

### Critical User Requirements
- Dropdown clicks should work with single click (no double-click requirement)
- Input fields must not "shake" - characters should append naturally
- Remove focus and send text buttons from interface
- Native browser-like experience with proper loading indicators
- Input focusing must work on first click
- Character typing should build text naturally (m-i-l-k, not m-i-l-k with replacements)
- URL bar should be fully editable without read-only behavior
import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ShoppingItem {
  name: string;
  quantity?: string;
  notes?: string;
}

export interface PriceAnalysis {
  item: string;
  cheapestStore: string;
  price: string;
  savings?: string;
  points?: string;
  confidence: number;
}

export interface FlippAnalysisResult {
  analyses: PriceAnalysis[];
  summary: string;
  nextSteps: string;
}

export class AIShoppingAssistant {
  private conversationHistory: any[] = [];

  constructor() {
    this.conversationHistory.push({
      role: "system",
      content: `You are a helpful shopping assistant that helps users find the best deals on Flipp.com. Your capabilities include:

1. Collecting user's postal code and shopping list
2. Analyzing Flipp.com search result screenshots to identify the cheapest prices
3. Comparing prices across different stores (Metro, Fortinos, Loblaws, etc.)
4. Providing clear recommendations with store names, prices, and potential savings

When analyzing screenshots:
- Look for product prices, store names, and any promotional offers
- Identify the cheapest option for each item
- Note any loyalty points or cashback offers
- Be specific about store names and exact prices
- Calculate potential savings when comparing options

Always respond in a friendly, helpful manner and ask clarifying questions when needed.`
    });
  }

  async startShoppingSession(): Promise<string> {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        ...this.conversationHistory,
        {
          role: "user",
          content: "Hello! I'd like to start a new shopping session to find the best deals."
        }
      ]
    });

    const assistantReply = response.choices[0].message.content || "";
    this.conversationHistory.push({ role: "assistant", content: assistantReply });
    
    return assistantReply;
  }

  async processUserMessage(message: string): Promise<string> {
    this.conversationHistory.push({ role: "user", content: message });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: this.conversationHistory
    });

    const assistantReply = response.choices[0].message.content || "";
    this.conversationHistory.push({ role: "assistant", content: assistantReply });
    
    return assistantReply;
  }

  async analyzeFlippScreenshots(
    item: string,
    screenshots: string[]
  ): Promise<FlippAnalysisResult> {
    try {
      // For now, analyze single screenshot at a time to avoid type issues
      const screenshot = screenshots[0];
      if (!screenshot) {
        return {
          analyses: [],
          summary: "No screenshots provided for analysis.",
          nextSteps: "Please provide screenshots to analyze."
        };
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert at analyzing grocery store flyers and price comparison. Analyze the image and provide accurate, detailed analysis of prices and deals. Respond with JSON only."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this Flipp.com search result screenshot for "${item}". Identify all visible prices, store names (Metro, Fortinos, Loblaws, etc.), the cheapest option, promotional offers, and package sizes. Respond with JSON in this format: {"analyses": [{"item": "item name", "cheapestStore": "store name", "price": "$X.XX", "savings": "Save $X.XX", "points": "earn X points", "confidence": 0.9}], "summary": "Brief summary", "nextSteps": "What to do next"}`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${screenshot}`
                }
              }
            ]
          }
        ],
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      // Add this analysis to conversation history
      this.conversationHistory.push({
        role: "assistant",
        content: `I analyzed the Flipp.com results for ${item}. ${result.summary}`
      });

      return result;
    } catch (error) {
      console.error("Failed to analyze screenshots:", error);
      return {
        analyses: [],
        summary: "Unable to analyze screenshots at this time.",
        nextSteps: "Please try again or contact support."
      };
    }
  }

  parseShoppingList(userInput: string): ShoppingItem[] {
    // Simple parsing - can be enhanced with AI if needed
    const lines = userInput.split('\n').filter(line => line.trim());
    return lines.map(line => {
      const trimmed = line.trim().replace(/^[-*•]\s*/, '');
      return { name: trimmed };
    });
  }

  extractPostalCode(userInput: string): string | null {
    // Canadian postal code pattern: A1A 1A1 or A1A1A1
    const postalCodeRegex = /([A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d)/;
    const match = userInput.match(postalCodeRegex);
    return match ? match[1].toUpperCase().replace(/\s/g, '') : null;
  }
}
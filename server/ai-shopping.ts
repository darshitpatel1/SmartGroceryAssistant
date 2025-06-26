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
    const input = userInput.toLowerCase();
    
    // Common food items and groceries
    const foodItems = [
      'milk', 'bread', 'eggs', 'butter', 'cheese', 'yogurt', 'chicken', 'beef', 'pork', 'fish',
      'salmon', 'tuna', 'rice', 'pasta', 'cereal', 'oats', 'flour', 'sugar', 'salt', 'pepper',
      'onions', 'potatoes', 'carrots', 'tomatoes', 'lettuce', 'spinach', 'broccoli', 'bananas',
      'apples', 'oranges', 'strawberries', 'grapes', 'lemons', 'avocado', 'cucumber', 'peppers',
      'garlic', 'ginger', 'herbs', 'spices', 'oil', 'vinegar', 'sauce', 'ketchup', 'mustard',
      'mayo', 'jam', 'honey', 'nuts', 'almonds', 'walnuts', 'crackers', 'cookies', 'chocolate',
      'ice cream', 'frozen', 'pizza', 'soup', 'beans', 'lentils', 'quinoa', 'coffee', 'tea',
      'juice', 'water', 'soda', 'beer', 'wine', 'detergent', 'soap', 'shampoo', 'toothpaste',
      'tissue', 'toilet paper', 'paper towels', 'cleaning', 'diapers', 'formula', 'cat food',
      'dog food', 'treats', 'litter'
    ];
    
    const foundItems: ShoppingItem[] = [];
    
    // Look for food items in the input
    for (const item of foodItems) {
      if (input.includes(item)) {
        // Extract quantity if present
        const quantityRegex = new RegExp(`(\\d+)\\s*(?:x\\s*)?${item}|${item}\\s*(?:x\\s*)?(\\d+)`, 'i');
        const match = userInput.match(quantityRegex);
        const quantity = match ? (match[1] || match[2]) : undefined;
        
        foundItems.push({ 
          name: item.charAt(0).toUpperCase() + item.slice(1),
          quantity: quantity ? `${quantity}` : undefined
        });
      }
    }
    
    // Also parse line-by-line for explicit lists
    const lines = userInput.split(/[,\n]/).filter(line => line.trim());
    for (const line of lines) {
      const trimmed = line.trim().replace(/^[-*•]\s*/, '').replace(/^\d+\.?\s*/, '');
      if (trimmed.length > 2 && !foundItems.some(item => 
        item.name.toLowerCase() === trimmed.toLowerCase()
      )) {
        // Check if it looks like a food item (not a postal code or other text)
        if (!/^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/.test(trimmed) && 
            !/^(i|me|my|the|and|or|but|in|on|at|to|for|of|with|by)$/i.test(trimmed)) {
          foundItems.push({ name: trimmed });
        }
      }
    }
    
    return foundItems;
  }

  extractPostalCode(userInput: string): string | null {
    // Canadian postal code pattern: A1A 1A1 or A1A1A1
    const postalCodeRegex = /\b([A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d)\b/g;
    const matches = userInput.match(postalCodeRegex);
    if (matches) {
      // Return the first valid postal code found
      return matches[0].toUpperCase().replace(/\s/g, '');
    }
    
    // Also check for postal codes without word boundaries (more flexible)
    const flexibleRegex = /([A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d)/;
    const match = userInput.match(flexibleRegex);
    return match ? match[1].toUpperCase().replace(/\s/g, '') : null;
  }
}
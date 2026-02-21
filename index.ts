import { MCPServer, widget, text, error } from "mcp-use/server";
import { z } from "zod";
import { ChatOpenAI } from "@langchain/openai";

const SHOP_URL = process.env.SHOP_URL!;

const server = new MCPServer({
  name: "skin-care-addiction",
  title: "Skin Care Addiction",
  version: "1.0.0",
  baseUrl: process.env.MCP_URL || "http://localhost:3000",
});

const MAX_CAROUSEL_RESULTS = 10;

const llm = new ChatOpenAI({
  model: "gpt-5-mini-2025-08-07",
  apiKey: process.env.OPENAI_API_KEY,
});

// --- Shopify MCP helpers ---

async function callShopifyMCP(toolName: string, args: Record<string, any>): Promise<any> {
  const url = `https://${SHOP_URL}/api/mcp`;
  const body = {
    jsonrpc: "2.0",
    id: Date.now(),
    method: "tools/call",
    params: { name: toolName, arguments: args },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`Shopify MCP error: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  if (json.error) {
    throw new Error(`Shopify MCP error: ${json.error.message || JSON.stringify(json.error)}`);
  }

  return json.result;
}

// --- Store theme cache ---

let storeThemeCache: { accent_color: string; store_name: string } | null = null;

async function fetchStoreTheme(): Promise<{ accent_color: string; store_name: string }> {
  if (storeThemeCache) return storeThemeCache;

  let accentColor = "#116b65"; // fallback
  let storeName = SHOP_URL.replace(/\.myshopify\.com$|\.com$/, "");

  try {
    const res = await fetch(`https://${SHOP_URL}`, {
      signal: AbortSignal.timeout(8000),
    });
    const html = await res.text();

    // Extract theme-color meta tag
    const themeColorMatch = html.match(
      /<meta\s+name=["']theme-color["']\s+content=["']([^"']+)["']/i
    );
    if (themeColorMatch) {
      accentColor = themeColorMatch[1];
    }

    // Extract store name from <title> tag
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      storeName = titleMatch[1].trim();
    }
  } catch (err: any) {
    console.warn("Failed to fetch store theme, using defaults:", err?.message);
  }

  storeThemeCache = { accent_color: accentColor, store_name: storeName };
  return storeThemeCache;
}

// Eagerly fetch theme on startup
fetchStoreTheme().catch(() => {});

// --- get-products tool ---

server.tool(
  {
    name: "get-products",
    title: "Search Skincare Products",
    description:
      "Search the skincare product catalog by skin condition labels and optional price filter. " +
      "Use this tool when the user asks for product recommendations, mentions skin concerns, " +
      "or uploads a photo of their skin. " +
      "IMPORTANT BEHAVIOR: " +
      "(1) If the user uploads a skin photo, analyze it to extract visible skin conditions (e.g. acne, hyperpigmentation, dryness) and map them to the supported labels. " +
      "(2) If the user describes concerns in text, extract the relevant skin condition labels from their message. " +
      "(3) If the user's concern is vague or no skin condition can be determined, ask clarifying follow-up questions — do NOT guess or assume conditions. " +
      "(4) You may combine multiple labels to find products that target several concerns at once. " +
      "Results are ranked by relevance.",
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
    },
    schema: z.object({
      labels: z
        .array(z.string())
        .describe(
          "One or more skin condition labels describing the user's concerns. " +
          "Examples: ['Oily skin', 'Large pores', 'Blackheads'], ['Dry skin', 'Wrinkles'], ['Acne scarring', 'Hyperpigmentation']"
        ),
      price: z
        .number()
        .optional()
        .describe(
          "Optional maximum price in USD. Only products priced at or below this value are returned. Example: 30"
        ),
    }),
    widget: {
      name: "product-carousel",
      invoking: "Searching skincare products...",
      invoked: "Products found",
    },
  },
  async ({ labels, price }) => {
    try {
      // Step 1: Use LLM to convert skin condition labels into Shopify search keywords
      const queryResponse = await llm.invoke([
        {
          role: "system",
          content:
            "You are a skincare product search expert. Convert the given skin condition labels into a concise Shopify search query. " +
            "Shopify search is text-matching, NOT semantic. You must translate skin concerns into product types, ingredient names, and product keywords that would appear in product titles/descriptions. " +
            "Output ONLY the search query string, nothing else. Keep it under 10 words. " +
            "Examples:\n" +
            '- ["Oily skin", "Blackheads"] → "oil control salicylic acid cleanser BHA"\n' +
            '- ["Dry skin", "Wrinkles"] → "hyaluronic acid moisturizer anti-aging retinol"\n' +
            '- ["Hyperpigmentation", "Uneven skin tone"] → "vitamin C brightening serum niacinamide"',
        },
        {
          role: "user",
          content: JSON.stringify(labels),
        },
      ]);

      const searchQuery = String(queryResponse.content).trim().replace(/^["']|["']$/g, "");

      // Step 2: Call Shopify MCP to search catalog
      const searchArgs: Record<string, any> = {
        query: searchQuery,
        context: `User is looking for skincare products for: ${labels.join(", ")}`,
      };
      if (price !== undefined) {
        searchArgs.filters = [{ price: { max: price } }];
      }
      const result = await callShopifyMCP("search_shop_catalog", searchArgs);

      // Parse products from MCP response
      let products: any[] = [];
      if (result?.content) {
        for (const block of result.content) {
          if (block.type === "text" && block.text) {
            try {
              const parsed = JSON.parse(block.text);
              products = Array.isArray(parsed)
                ? parsed
                : parsed.products || (parsed.product ? [parsed.product] : []);
            } catch {
              // text wasn't JSON, skip
            }
          }
        }
      }

      if (products.length === 0) {
        const priceMsg = price !== undefined ? ` under $${price}` : "";
        return error(
          `No products found matching ${labels.join(", ")}${priceMsg}. Try broadening your filters.`
        );
      }

      // Step 4: Normalize Shopify product data to carousel format
      const matches = products.slice(0, MAX_CAROUSEL_RESULTS);

      const storeTheme = await fetchStoreTheme();

      return widget({
        props: {
          products: matches.map((p: any) => ({
            id: String(p.product_id || p.id),
            name: p.title || p.name || "",
            description: p.description || "",
            labels: p.tags ? (Array.isArray(p.tags) ? p.tags : p.tags.split(",").map((t: string) => t.trim())) : [],
            product_link: p.url || p.product_url || "",
            image_urls: p.image_url ? [p.image_url] : p.image_urls || p.images || [],
            price: parseFloat(p.price_range?.min ?? p.price ?? "0"),
          })),
          searchLabels: labels,
          store_theme: storeTheme,
        },
        output: text(
          `Found ${products.length} skincare products for ${labels.join(", ")}${price !== undefined ? ` under $${price}` : ""} (showing top ${matches.length}):\n` +
            matches
              .map(
                (p: any) =>
                  `- ${p.title || p.name} ($${parseFloat(p.price_range?.min ?? p.price ?? "0").toFixed(2)}) — ${p.tags || ""}`
              )
              .join("\n")
        ),
      });
    } catch (err: any) {
      console.error("get-products error:", err?.message || err);
      return error(
        `Failed to search products: ${err?.message || "Unknown error"}. Please try again.`
      );
    }
  }
);

// --- product-detail tool ---

server.tool(
  {
    name: "product-detail",
    title: "Show Personalized Product Details",
    description:
      "Show full details and a personalized recommendation for a specific skincare product. " +
      "Use this tool when the user clicks on a product from the carousel, asks to see more about a product, " +
      "or references a product by name or ID. " +
      "IMPORTANT BEHAVIOR: " +
      "(1) Before calling this tool, gather the user's skin profile from the conversation history and any chatbot memory — " +
      "include skin type, active concerns, treatment goals, ingredient preferences, sensitivities, and budget. " +
      "(2) Pass all of this as a comprehensive user_preferences string so the personalized recommendation is as relevant as possible. " +
      "(3) The tool fetches the product from the store and uses an LLM to generate a tailored 2-3 paragraph recommendation " +
      "explaining why this product suits the user's specific needs.",
    annotations: {
      readOnlyHint: true,
      openWorldHint: true,
    },
    schema: z.object({
      product_id: z
        .string()
        .describe("The Shopify GID of the product to show details for. Obtained from get-products results."),
      user_preferences: z
        .string()
        .describe(
          "Comprehensive summary of the user's skincare profile extracted from conversation history and chatbot memory. " +
          "Include: skin type, active concerns, treatment goals, ingredient preferences or sensitivities, budget, " +
          "and any other relevant context. " +
          "Example: 'Combination skin with oily T-zone. Main concerns: hormonal acne on chin and jawline, " +
          "post-inflammatory hyperpigmentation on cheeks. Goals: clear breakouts and fade dark spots. " +
          "Prefers fragrance-free, non-comedogenic products. Budget under $35. Currently using salicylic acid cleanser.'"
        ),
    }),
    widget: {
      name: "product-detail",
      invoking: "Crafting your personalized recommendation...",
      invoked: "Your personalized recommendation is ready",
    },
  },
  async ({ product_id, user_preferences }) => {
    try {
      // Fetch product details from Shopify MCP
      const result = await callShopifyMCP("get_product_details", { product_id });

      // Parse product from MCP response
      let product: any = null;
      if (result?.content) {
        for (const block of result.content) {
          if (block.type === "text" && block.text) {
            try {
              const parsed = JSON.parse(block.text);
              product = parsed.product ?? parsed;
            } catch {
              // text wasn't JSON, skip
            }
          }
        }
      }

      if (!product) {
        return error(`Product not found (ID: ${product_id})`);
      }

      const productName = product.title || product.name || "";
      const productDescription = product.description || product.body_html || "";
      const productTags = product.tags
        ? (Array.isArray(product.tags) ? product.tags.join(", ") : product.tags)
        : "";
      const productPrice = parseFloat(product.price_range?.min ?? product.price ?? "0").toFixed(2);
      const productImage = product.image_url || product.images?.[0] || "";
      const productLink = product.url || product.product_url || "";

      // Generate personalized description using LLM
      const response = await llm.invoke([
        {
          role: "system",
          content:
            "You are an expert skincare sales associate. Write a personalized 2-3 paragraph product recommendation. " +
            "Be warm, knowledgeable, and specific about why this product suits the user's needs. " +
            "Reference their specific concerns and explain how the product's ingredients or properties address them. " +
            "Keep it concise and engaging.",
        },
        {
          role: "user",
          content:
            `Product: ${productName}\n` +
            `Description: ${productDescription}\n` +
            `Tags: ${productTags}\n` +
            `Price: $${productPrice}\n\n` +
            `User preferences: ${user_preferences}`,
        },
      ]);

      const personalizedDescription = String(response.content);

      const storeTheme = await fetchStoreTheme();

      return widget({
        props: {
          product_id,
          product_name: productName,
          personalized_description: personalizedDescription,
          labels: productTags,
          image_links: productImage,
          product_link: productLink,
          price: productPrice,
          store_theme: storeTheme,
        },
        output: text(
          `${productName} — $${productPrice}\n\n${personalizedDescription}\n\nTags: ${productTags}\nBuy: ${productLink}`
        ),
      });
    } catch (err: any) {
      console.error("product-detail error:", err?.message || err);
      return error(
        `Failed to get product details: ${err?.message || "Unknown error"}. Please try again.`
      );
    }
  }
);

server.listen();

import { MCPServer, widget, text, error } from "mcp-use/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { ChatOpenAI } from "@langchain/openai";

const supabase = createClient(
  process.env.SUPABASE_PROJECT_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const server = new MCPServer({
  name: "skin-care-addiction",
  title: "Skin Care Addiction",
  version: "1.0.0",
  baseUrl: process.env.MCP_URL || "http://localhost:3000",
});

// --- Skin condition labels ---

const SKIN_LABELS = [
  "Whiteheads",
  "Blackheads",
  "Cystic acne",
  "Hormonal breakouts",
  "Acne scarring",
  "Textured skin",
  "Large pores",
  "Hyperpigmentation",
  "Post-inflammatory hyperpigmentation",
  "Melasma",
  "Uneven skin tone",
  "Wrinkles",
  "Fine lines",
  "Oily skin",
  "Dry skin",
  "Combination skin",
  "Normal skin",
] as const;

const MAX_CAROUSEL_RESULTS = 10;

/** Convert cents (stored in DB) to dollar string, e.g. 1499 → "14.99" */
function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2);
}

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
      "Results are ranked by relevance (most matching labels first).",
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
    },
    schema: z.object({
      labels: z
        .array(z.string())
        .describe(
          "One or more skin condition labels to filter products by. " +
          "Supported values: 'Whiteheads', 'Blackheads', 'Cystic acne', 'Hormonal breakouts', " +
          "'Acne scarring', 'Textured skin', 'Large pores', 'Hyperpigmentation', " +
          "'Post-inflammatory hyperpigmentation', 'Melasma', 'Uneven skin tone', " +
          "'Wrinkles', 'Fine lines', 'Oily skin', 'Dry skin', 'Combination skin', 'Normal skin'. " +
          "Example: ['Oily skin', 'Large pores', 'Blackheads']"
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
    // Validate labels against known values
    const validLabelsLower = SKIN_LABELS.map((l) => l.toLowerCase());
    const labelsLower = labels.map((l) => l.toLowerCase());
    const invalidLabels = labels.filter(
      (l) => !validLabelsLower.includes(l.toLowerCase())
    );
    if (invalidLabels.length > 0) {
      return error(
        `Unknown skin condition label(s): ${invalidLabels.join(", ")}. ` +
          `Supported values: ${SKIN_LABELS.join(", ")}.`
      );
    }

    try {
      let query = supabase.from("products").select("*");

      // Price is stored in cents — convert user's dollar amount to cents
      if (price !== undefined) {
        query = query.lte("price", price * 100);
      }

      const { data, error: dbError } = await query;

      if (dbError) {
        return error(`Failed to fetch products: ${dbError.message}`);
      }

      // Case-insensitive label matching
      const filtered = (data || []).filter((p) =>
        p.labels.some((l: string) => labelsLower.includes(l.toLowerCase()))
      );

      if (filtered.length === 0) {
        const priceMsg = price !== undefined ? ` under $${price}` : "";
        return error(
          `No products found matching ${labels.join(", ")}${priceMsg}. Try broadening your filters.`
        );
      }

      // Sort by number of matching labels (most relevant first)
      const sorted = filtered.sort((a, b) => {
        const aMatchCount = a.labels.filter((l: string) =>
          labelsLower.includes(l.toLowerCase())
        ).length;
        const bMatchCount = b.labels.filter((l: string) =>
          labelsLower.includes(l.toLowerCase())
        ).length;
        return bMatchCount - aMatchCount;
      });

      // Cap results for a usable carousel
      const matches = sorted.slice(0, MAX_CAROUSEL_RESULTS);
      const totalFound = sorted.length;

      return widget({
        props: {
          products: matches.map((p) => ({
            id: String(p.id),
            name: p.name,
            description: p.description,
            labels: p.labels,
            product_link: p.product_link,
            image_urls: p.image_links,
            price: p.price / 100,
          })),
          searchLabels: labels,
        },
        output: text(
          `Found ${totalFound} skincare products for ${labels.join(", ")}${price !== undefined ? ` under $${price}` : ""} (showing top ${matches.length}):\n` +
            matches
              .map(
                (p: any) =>
                  `- ${p.name} ($${formatPrice(p.price)}) — ${p.labels.join(", ")}`
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

const llm = new ChatOpenAI({
  model: "gpt-5-mini-2025-08-07",
  apiKey: process.env.OPENAI_API_KEY,
});

// In-memory cache for personalized recommendations (resets on server restart)
const recommendationCache = new Map<string, string>();

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
      "(3) The tool fetches the product from the database and uses an LLM to generate a tailored 2-3 paragraph recommendation " +
      "explaining why this product suits the user's specific needs.",
    annotations: {
      readOnlyHint: true,
      openWorldHint: true,
    },
    schema: z.object({
      product_id: z
        .number()
        .describe("The numeric ID of the product to show details for. Obtained from get-products results."),
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
    const { data: product, error: dbError } = await supabase
      .from("products")
      .select("*")
      .eq("id", product_id)
      .single();

    if (dbError || !product) {
      return error(`Product not found (ID: ${product_id})`);
    }

    // Generate personalized description using LLM (with cache)
    try {
      const cacheKey = `${product_id}:${user_preferences}`;
      let personalizedDescription = recommendationCache.get(cacheKey);

      if (!personalizedDescription) {
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
              `Product: ${product.name}\n` +
              `Description: ${product.description}\n` +
              `Targets: ${product.labels.join(", ")}\n` +
              `Price: $${formatPrice(product.price)}\n\n` +
              `User preferences: ${user_preferences}`,
          },
        ]);

        personalizedDescription = String(response.content);
        recommendationCache.set(cacheKey, personalizedDescription);
      }

      return widget({
        props: {
          product_id,
          product_name: product.name,
          personalized_description: personalizedDescription,
          labels: product.labels.join(", "),
          image_links: product.image_links?.[0] || "",
          product_link: product.product_link,
          price: formatPrice(product.price),
        },
        output: text(
          `${product.name} — $${formatPrice(product.price)}\n\n${personalizedDescription}\n\nLabels: ${product.labels.join(", ")}\nBuy: ${product.product_link}`
        ),
      });
    } catch (err: any) {
      console.error("LLM error:", err?.message || err);
      return error(
        `Failed to generate personalized recommendation for ${product.name}: ${err?.message || "Unknown error"}. Please try again.`
      );
    }
  }
);

server.listen({ host: "0.0.0.0", port: Number(process.env.PORT) || 3000 });

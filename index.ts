import { MCPServer, widget, text, error } from "mcp-use/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

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


// --- get_products tool ---

server.tool(
  {
    name: "get_products",
    description:
      "Search skincare products by skin condition labels and max price. Use this tool when the user asks for a skincare product recommendation. Extract data from the user's skin picture (if provided) and their question, then turn it into a search query. If the user doesn't provide skin condition or if you cannot extract the skin condition from photos, ask follow-up questions instead of making assumptions.",
    schema: z.object({
      labels: z
        .array(z.string())
        .describe(
          "Skin condition labels to filter products by. Supported values: Whiteheads, Blackheads, Cystic acne, Hormonal breakouts, Acne scarring, Textured skin, Large pores, Hyperpigmentation, Post-inflammatory hyperpigmentation, Melasma, Uneven skin tone, Wrinkles, Fine lines, Oily skin, Dry skin, Combination skin, Normal skin."
        ),
      price: z
        .number()
        .optional()
        .describe(
          "Maximum price in USD to filter products. Only products at or below this price will be returned."
        ),
    }),
    widget: {
      name: "product-carousel",
      invoking: "Searching skincare products...",
      invoked: "Products found",
    },
  },
  async ({ labels, price }) => {
    const labelsLower = labels.map((l) => l.toLowerCase());

    let query = supabase.from("products").select("*");

    if (price !== undefined) {
      query = query.lte("price", price);
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
    const matches = filtered.sort((a, b) => {
      const aMatchCount = a.labels.filter((l: string) =>
        labelsLower.includes(l.toLowerCase())
      ).length;
      const bMatchCount = b.labels.filter((l: string) =>
        labelsLower.includes(l.toLowerCase())
      ).length;
      return bMatchCount - aMatchCount;
    });

    return widget({
      props: {
        products: matches.map((p) => ({
          id: String(p.id),
          name: p.name,
          description: p.description,
          labels: p.labels,
          product_link: p.product_link,
          image_urls: p.image_links,
          price: p.price,
        })),
        searchLabels: labels,
      },
      output: text(
        `Found ${matches.length} skincare products for ${labels.join(", ")}${price !== undefined ? ` under $${price}` : ""}:\n` +
          matches
            .map((p: any) => `- ${p.name} ($${p.price}) — ${p.labels.join(", ")}`)
            .join("\n")
      ),
    });
  }
);

// --- product-detail tool ---

server.tool(
  {
    name: "product-detail",
    title: "Show Product Details",
    description:
      "Use this tool when the user wants to see detailed information about a specific skincare product. IMPORTANT: Before calling this tool, the chatbot must act like the best skincare sales associate and generate a personalized product description based on the product's original description and the user's skincare history/concerns from the conversation. Write 2-3 engaging paragraphs explaining why this product is perfect for their skin concerns, then pass that personalized description in the personalized_description parameter.",
    schema: z.object({
      product_id: z.number().describe("The ID of the product to show details for"),
      product_name: z.string().describe("The name of the product"),
      personalized_description: z
        .string()
        .describe(
          "The AI-generated personalized description that explains why this product is perfect for the user's specific skin concerns"
        ),
      labels: z.string().describe("Comma-separated skin condition labels"),
      image_links: z.string().describe("Product image URL"),
      product_link: z.string().describe("Product purchase link"),
      price: z.string().describe("Product price"),
    }),
    widget: {
      name: "product-detail",
      invoking: "Loading product details...",
      invoked: "Product details ready",
    },
  },
  async ({ product_id, product_name, personalized_description, labels, image_links, product_link, price }) => {
    return widget({
      props: {
        product_id,
        product_name,
        personalized_description,
        labels,
        image_links,
        product_link,
        price,
      },
      output: text(
        `${product_name} — $${price}\n\n${personalized_description}\n\nLabels: ${labels}\nBuy: ${product_link}`
      ),
    });
  }
);

server.listen();

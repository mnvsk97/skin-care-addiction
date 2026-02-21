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
    let query = supabase
      .from("products")
      .select("*")
      .overlaps("labels", labels);

    if (price !== undefined) {
      query = query.lte("price", price);
    }

    const { data, error: dbError } = await query;

    if (dbError) {
      return error(`Failed to fetch products: ${dbError.message}`);
    }

    if (!data || data.length === 0) {
      const priceMsg = price !== undefined ? ` under $${price}` : "";
      return error(
        `No products found matching ${labels.join(", ")}${priceMsg}. Try broadening your filters.`
      );
    }

    // Sort by number of matching labels (most relevant first)
    const matches = data.sort((a, b) => {
      const aMatchCount = a.labels.filter((l: string) =>
        labels.includes(l)
      ).length;
      const bMatchCount = b.labels.filter((l: string) =>
        labels.includes(l)
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

// --- get_personalized_product_description tool ---

server.tool(
  {
    name: "get_personalized_product_description",
    description:
      "Generate a personalized product description for a skincare product. Act like the best skincare sales associate and create a tailored description based on the product details and the user's skincare history/needs.",
    schema: z.object({
      product_description: z
        .string()
        .describe(
          "The original product description to personalize for the user."
        ),
    }),
    widget: {
      name: "product-detail",
      invoking: "Creating your personalized recommendation...",
      invoked: "Recommendation ready",
    },
  },
  async ({ product_description }) => {
    // Fallback: return the original description with a formatted wrapper
    const personalized = `Personalized Recommendation\n\n${product_description}\n\nPro tip: Introduce this product gradually into your routine — start with 2-3 times per week and increase as your skin adjusts. Always pair with a broad-spectrum SPF during the day!`;

    return widget({
      props: { description: personalized },
      output: text(personalized),
    });
  }
);

server.listen();

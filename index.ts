import { MCPServer, widget, text, error } from "mcp-use/server";
import { z } from "zod";

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

// --- Mock product database ---

interface Product {
  id: string;
  name: string;
  description: string;
  labels: string[];
  product_link: string;
  image_urls: string[];
  price: number;
}

const PRODUCTS: Product[] = [
  {
    id: "1",
    name: "CeraVe Salicylic Acid Cleanser",
    description:
      "A gentle foaming cleanser with 0.5% salicylic acid, ceramides, and niacinamide. Clears pores without stripping the skin barrier. Fragrance-free and non-comedogenic.",
    labels: ["Whiteheads", "Blackheads", "Oily skin", "Large pores"],
    product_link: "https://example.com/cerave-sa-cleanser",
    image_urls: [
      "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=400&fit=crop",
    ],
    price: 15,
  },
  {
    id: "2",
    name: "Paula's Choice 2% BHA Liquid Exfoliant",
    description:
      "Cult-favorite leave-on exfoliant with 2% salicylic acid. Unclogs pores, smooths wrinkles, and evens skin tone. Gentle enough for daily use.",
    labels: [
      "Blackheads",
      "Whiteheads",
      "Large pores",
      "Textured skin",
      "Oily skin",
    ],
    product_link: "https://example.com/paulas-choice-bha",
    image_urls: [
      "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&h=400&fit=crop",
    ],
    price: 34,
  },
  {
    id: "3",
    name: "La Roche-Posay Effaclar Duo+",
    description:
      "Targeted acne treatment with niacinamide, LHA, and piroctone olamine. Reduces blemishes and prevents recurrence while maintaining skin hydration.",
    labels: ["Cystic acne", "Hormonal breakouts", "Oily skin", "Large pores"],
    product_link: "https://example.com/lrp-effaclar-duo",
    image_urls: [
      "https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=400&h=400&fit=crop",
    ],
    price: 30,
  },
  {
    id: "4",
    name: "The Ordinary Niacinamide 10% + Zinc 1%",
    description:
      "High-strength vitamin and mineral formula that visibly reduces blemishes and congestion. Balances sebum activity for a clearer complexion.",
    labels: [
      "Oily skin",
      "Large pores",
      "Hormonal breakouts",
      "Combination skin",
    ],
    product_link: "https://example.com/ordinary-niacinamide",
    image_urls: [
      "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=400&h=400&fit=crop",
    ],
    price: 6,
  },
  {
    id: "5",
    name: "Differin Adapalene Gel 0.1%",
    description:
      "OTC retinoid treatment that normalizes skin cell turnover and has anti-inflammatory properties. Prevents new acne from forming deep within pores.",
    labels: [
      "Cystic acne",
      "Whiteheads",
      "Blackheads",
      "Acne scarring",
      "Textured skin",
    ],
    product_link: "https://example.com/differin-gel",
    image_urls: [
      "https://images.unsplash.com/photo-1631729371254-42c2892f0e6e?w=400&h=400&fit=crop",
    ],
    price: 16,
  },
  {
    id: "6",
    name: "Good Molecules Discoloration Correcting Serum",
    description:
      "Lightweight serum with tranexamic acid, niacinamide, and kojic acid. Targets dark spots, sun damage, and post-acne marks for a more even complexion.",
    labels: [
      "Hyperpigmentation",
      "Post-inflammatory hyperpigmentation",
      "Melasma",
      "Uneven skin tone",
      "Acne scarring",
    ],
    product_link: "https://example.com/good-molecules-discoloration",
    image_urls: [
      "https://images.unsplash.com/photo-1570194065650-d99fb4a38691?w=400&h=400&fit=crop",
    ],
    price: 12,
  },
  {
    id: "7",
    name: "Drunk Elephant Protini Polypeptide Cream",
    description:
      "Signal peptide moisturizer that improves skin tone, texture, and firmness. Combines growth factors, amino acids, and pygmy waterlily for visible anti-aging results.",
    labels: [
      "Wrinkles",
      "Fine lines",
      "Dry skin",
      "Textured skin",
      "Normal skin",
    ],
    product_link: "https://example.com/drunk-elephant-protini",
    image_urls: [
      "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop",
    ],
    price: 68,
  },
  {
    id: "8",
    name: "CeraVe Moisturizing Cream",
    description:
      "Rich, non-greasy cream with 3 essential ceramides and hyaluronic acid. Restores and maintains the skin's natural barrier. Developed with dermatologists.",
    labels: ["Dry skin", "Normal skin", "Combination skin", "Textured skin"],
    product_link: "https://example.com/cerave-moisturizing-cream",
    image_urls: [
      "https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=400&h=400&fit=crop",
    ],
    price: 19,
  },
  {
    id: "9",
    name: "Fenty Skin Fat Water Pore-Refining Toner Serum",
    description:
      "2-in-1 toner-serum hybrid with niacinamide, Barbados cherry, and hyaluronic acid. Minimizes pores, fights dark spots, and removes residual impurities.",
    labels: [
      "Large pores",
      "Uneven skin tone",
      "Combination skin",
      "Hyperpigmentation",
    ],
    product_link: "https://example.com/fenty-fat-water",
    image_urls: [
      "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=400&h=400&fit=crop",
    ],
    price: 28,
  },
  {
    id: "10",
    name: "Neutrogena Hydro Boost Water Gel",
    description:
      "Oil-free, water-gel moisturizer with purified hyaluronic acid. Instantly quenches dry skin and keeps it looking supple and hydrated all day.",
    labels: ["Dry skin", "Combination skin", "Normal skin", "Fine lines"],
    product_link: "https://example.com/neutrogena-hydro-boost",
    image_urls: [
      "https://images.unsplash.com/photo-1617897903246-719242758050?w=400&h=400&fit=crop",
    ],
    price: 20,
  },
  {
    id: "11",
    name: "Murad Rapid Dark Spot Correcting Serum",
    description:
      "Clinically proven to reduce dark spots by 36% in 7 days. Features resorcinol and tranexamic acid to address stubborn hyperpigmentation at every layer of skin.",
    labels: [
      "Hyperpigmentation",
      "Melasma",
      "Post-inflammatory hyperpigmentation",
      "Uneven skin tone",
    ],
    product_link: "https://example.com/murad-dark-spot",
    image_urls: [
      "https://images.unsplash.com/photo-1615397349754-cfa2066a298e?w=400&h=400&fit=crop",
    ],
    price: 72,
  },
  {
    id: "12",
    name: "Cosrx Snail Mucin 96% Power Essence",
    description:
      "K-beauty bestseller with 96% snail secretion filtrate. Repairs damaged skin, hydrates deeply, and reduces acne scars. Lightweight, absorbs quickly.",
    labels: [
      "Acne scarring",
      "Dry skin",
      "Textured skin",
      "Post-inflammatory hyperpigmentation",
    ],
    product_link: "https://example.com/cosrx-snail-mucin",
    image_urls: [
      "https://images.unsplash.com/photo-1612817288484-6f916006741a?w=400&h=400&fit=crop",
    ],
    price: 22,
  },
  {
    id: "13",
    name: "Tatcha Dewy Skin Cream",
    description:
      "Plumping moisturizer with Japanese purple rice, hyaluronic acid, and botanical extracts. Delivers lasting dewiness for dry and mature skin types.",
    labels: ["Dry skin", "Wrinkles", "Fine lines", "Normal skin"],
    product_link: "https://example.com/tatcha-dewy-skin",
    image_urls: [
      "https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?w=400&h=400&fit=crop",
    ],
    price: 69,
  },
  {
    id: "14",
    name: "Hero Cosmetics Mighty Patch Original",
    description:
      "Hydrocolloid pimple patches that absorb pus and oil from blemishes overnight. Drug-free, vegan, and cruelty-free. Visible results in 6-8 hours.",
    labels: ["Whiteheads", "Cystic acne", "Hormonal breakouts"],
    product_link: "https://example.com/hero-mighty-patch",
    image_urls: [
      "https://images.unsplash.com/photo-1583209814683-c023dd293cc6?w=400&h=400&fit=crop",
    ],
    price: 13,
  },
  {
    id: "15",
    name: "Sunday Riley Good Genes All-In-One Lactic Acid Treatment",
    description:
      "Exfoliating treatment serum with lactic acid and licorice. Plumps fine lines, clears pores, and brightens skin for an instant glow. Suitable for all skin types.",
    labels: [
      "Fine lines",
      "Wrinkles",
      "Uneven skin tone",
      "Hyperpigmentation",
      "Textured skin",
    ],
    product_link: "https://example.com/sunday-riley-good-genes",
    image_urls: [
      "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400&h=400&fit=crop",
    ],
    price: 85,
  },
  {
    id: "16",
    name: "The Ordinary Azelaic Acid Suspension 10%",
    description:
      "Multifunctional brightening cream with 10% azelaic acid. Evens skin tone, reduces blemishes, and improves overall skin radiance. Silicone-free formula.",
    labels: [
      "Hormonal breakouts",
      "Post-inflammatory hyperpigmentation",
      "Uneven skin tone",
      "Textured skin",
    ],
    product_link: "https://example.com/ordinary-azelaic-acid",
    image_urls: [
      "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=400&h=400&fit=crop",
    ],
    price: 8,
  },
];

// --- get_products tool ---

server.tool(
  {
    name: "get_products",
    description:
      "Search skincare products by skin condition labels and max price. Use this tool when the user asks for a skincare product recommendation. Extract data from the user's skin picture (if provided) and their question, then turn it into a search query. If the user doesn't provide skin condition or if you cannot extract the skin condition from photos, ask follow-up questions instead of making assumptions.",
    schema: z.object({
      labels: z
        .array(
          z.enum([
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
          ])
        )
        .describe(
          "Skin condition labels to filter products by. Must match one or more of the supported conditions."
        ),
      price: z
        .number()
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
    const matches = PRODUCTS.filter(
      (product) =>
        product.price <= price &&
        product.labels.some((label) => labels.includes(label as any))
    ).sort((a, b) => {
      const aMatchCount = a.labels.filter((l) =>
        labels.includes(l as any)
      ).length;
      const bMatchCount = b.labels.filter((l) =>
        labels.includes(l as any)
      ).length;
      return bMatchCount - aMatchCount;
    });

    if (matches.length === 0) {
      return error(
        `No products found matching ${labels.join(", ")} under $${price}. Try broadening your filters.`
      );
    }

    return widget({
      props: {
        products: matches.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          labels: p.labels,
          product_link: p.product_link,
          image_urls: p.image_urls,
          price: p.price,
        })),
        searchLabels: labels,
      },
      output: text(
        `Found ${matches.length} skincare products for ${labels.join(", ")} under $${price}:\n` +
          matches
            .map((p) => `- ${p.name} ($${p.price}) — ${p.labels.join(", ")}`)
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
  async ({ product_description }, ctx) => {
    // Use LLM sampling if the client supports it to generate a truly personalized description
    if (ctx.client.can("sampling")) {
      const personalized = await ctx.sample(
        `You are the world's best skincare sales associate. A customer is looking at a product. Based on the following product description, generate an enthusiastic, knowledgeable, and personalized recommendation. Highlight key active ingredients, who it's best for, how to use it in a routine, and any tips.\n\nProduct: ${product_description}\n\nWrite a warm, personalized recommendation (2-3 paragraphs):`
      );
      return widget({
        props: { description: personalized },
        output: text(personalized),
      });
    }

    // Fallback: return the original description with a formatted wrapper
    const personalized = `✨ Personalized Recommendation ✨\n\n${product_description}\n\n💡 Pro tip: Introduce this product gradually into your routine — start with 2-3 times per week and increase as your skin adjusts. Always pair with a broad-spectrum SPF during the day!`;

    return widget({
      props: { description: personalized },
      output: text(personalized),
    });
  }
);

server.listen();

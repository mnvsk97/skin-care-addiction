# Skin Care Addiction

Personalized skincare product recommendations, powered by MCP.

Two million people visit the [r/SkincareAddiction](https://www.reddit.com/r/SkincareAddiction/) subreddit every day looking for product recommendations — but most of what they find is generic advice that doesn't account for their unique skin type, concerns, or lifestyle.

Everyone already uses AI assistants like ChatGPT and Claude. **What if your product search was personalized because your AI assistant already knows about you?**

Skin Care Addiction is an MCP app that connects to your AI assistant, searches across Amazon skincare products, and delivers recommendations tailored to *your* skin — using context from your conversation.

## How It Works

1. **Ask about your skin concerns** — Tell your AI assistant about your skin type, lifestyle, or upload a photo of your skin.
2. **Browse matching products** — A carousel of relevant Amazon products appears, ranked by how well they match your concerns.
3. **Tap any product for a personalized recommendation** — Instead of a generic product description, you see:
   - **Personalized Description** — Why this product is right for *your* specific skin, based on what the AI knows about you.
   - **Recommended Routine** — A concise AM/PM skincare routine incorporating the product.
4. **Buy on Amazon** — Click "Shop Now" to go straight to the product on Amazon.

## Tech Stack

- **MCP Server** — Built with [mcp-use](https://www.npmjs.com/package/mcp-use), exposes two tools (`get-products`, `product-detail`) and two widget resources (product carousel, product detail)
- **Database** — Supabase (PostgreSQL) storing product catalog with labels, prices, images, and Amazon links
- **LLM** — OpenAI `gpt-4o-mini` via LangChain for generating personalized recommendations with structured output
- **Widgets** — React components rendered inline in the chat UI (carousel + detail view)

## MCP Tools

| Tool | Description |
|------|-------------|
| `get-products` | Search products by skin condition labels (e.g. "Oily skin", "Acne scarring") with optional price filter. Returns a visual carousel widget. |
| `product-detail` | Get personalized recommendation for a specific product, using the user's skin profile from conversation context. Returns a detail widget with description, routine, and similar products. |

### Supported Skin Condition Labels

Whiteheads, Blackheads, Cystic acne, Hormonal breakouts, Acne scarring, Textured skin, Large pores, Hyperpigmentation, Post-inflammatory hyperpigmentation, Melasma, Uneven skin tone, Wrinkles, Fine lines, Oily skin, Dry skin, Combination skin, Normal skin

## Setup

### Prerequisites

- Node.js 18+
- A Supabase project with a `products` table
- An OpenAI API key

### Environment Variables

Create a `.env` file:

```env
SUPABASE_PROJECT_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
OPENAI_API_KEY=your-openai-key
```

### Install & Run

```bash
npm install
npm run dev
```

The server starts at `http://localhost:3000` with:
- MCP endpoint: `http://localhost:3000/mcp`
- Inspector UI: `http://localhost:3000/inspector`

### Deploy

```bash
npm run deploy:cloud
```

## Project Structure

```
index.ts                  # MCP server — tools, LLM, Supabase queries
resources/
  product-carousel.tsx    # Carousel widget — product grid + inline detail view
  product-detail.tsx      # Standalone product detail widget
product-db-generation/    # Scripts for generating the product catalog
```

## License

MIT

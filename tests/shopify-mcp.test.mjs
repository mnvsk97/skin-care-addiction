/**
 * Shopify MCP Integration E2E Tests
 *
 * Tests the Shopify MCP endpoint at naturequeenbeauty.com directly,
 * mirroring the callShopifyMCP() helper used in index.ts.
 *
 * Run with:  node tests/shopify-mcp.test.mjs
 * Requires:  Node 18+ (native fetch)
 *
 * Response shapes (confirmed against live API):
 *
 *   search_shop_catalog  → result.content[0].text = JSON string of:
 *     { products: [{ product_id, title, description, url, image_url,
 *                    price_range: { min, max, currency }, tags, variants }],
 *       pagination: {...}, available_filters: [...] }
 *
 *   get_product_details  → result.content[0].text = JSON string of:
 *     { product: { product_id, title, description, url, image_url, images,
 *                  price_range, selectedOrFirstAvailableVariant, ... },
 *       instructions: "..." }
 *
 *   search_shop_policies_and_faqs → result.content[0].text = JSON string of:
 *     [{ question, answer }, ...]
 */

const SHOPIFY_MCP_URL = "https://naturequeenbeauty.com/api/mcp";
const TIMEOUT_MS = 15000;

// ─── ANSI colours ─────────────────────────────────────────────────────────────
const GREEN  = "\x1b[32m";
const RED    = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN   = "\x1b[36m";
const BOLD   = "\x1b[1m";
const RESET  = "\x1b[0m";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Call the Shopify MCP endpoint (mirrors callShopifyMCP in index.ts). */
async function callShopifyMCP(toolName, args, id = Date.now()) {
  const body = {
    jsonrpc: "2.0",
    id,
    method: "tools/call",
    params: { name: toolName, arguments: args },
  };

  const res = await fetch(SHOPIFY_MCP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }

  const json = await res.json();

  if (json.error) {
    throw new Error(`MCP error: ${json.error.message ?? JSON.stringify(json.error)}`);
  }

  return json.result;
}

/**
 * Parse the raw text content blocks from any MCP result into a JS value.
 * Returns the first successfully parsed JSON block, or null.
 */
function parseFirstJsonBlock(result) {
  if (!result?.content) return null;
  for (const block of result.content) {
    if (block.type === "text" && block.text) {
      try {
        return JSON.parse(block.text);
      } catch {
        // not JSON — skip
      }
    }
  }
  return null;
}

/**
 * Extract products array from a search_shop_catalog result.
 * Shopify wraps products as: { products: [...], pagination: {...}, ... }
 */
function parseProducts(result) {
  const parsed = parseFirstJsonBlock(result);
  if (!parsed) return [];
  if (Array.isArray(parsed)) return parsed;                     // bare array (unlikely)
  if (Array.isArray(parsed.products)) return parsed.products;   // normal shape
  return [];
}

/**
 * Extract a single product from a get_product_details result.
 * Shopify wraps the product as: { product: { ... }, instructions: "..." }
 */
function parseProductDetail(result) {
  const parsed = parseFirstJsonBlock(result);
  if (!parsed) return null;
  // Preferred shape: { product: { ... } }
  if (parsed.product && typeof parsed.product === "object") return parsed.product;
  // Fallback: the top-level object is the product itself
  if (parsed.product_id || parsed.title) return parsed;
  return null;
}

// ─── Test runner ──────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTest(name, fn) {
  process.stdout.write(`\n${BOLD}${CYAN}TEST${RESET} ${name}\n`);
  try {
    await fn();
    console.log(`${GREEN}${BOLD}  PASS${RESET}`);
    passed++;
  } catch (err) {
    console.error(`${RED}${BOLD}  FAIL${RESET} — ${err.message}`);
    failed++;
  }
}

// ─── Shared state (GID flows from Test 1 into Test 2) ────────────────────────
let firstProductGid = null;

// ── Test 1: search_shop_catalog ───────────────────────────────────────────────
await runTest("Test 1: search_shop_catalog — oil control cleanser salicylic acid", async () => {
  const result = await callShopifyMCP(
    "search_shop_catalog",
    {
      query: "oil control cleanser salicylic acid",
      context: "User looking for skincare products for oily skin",
    },
    1
  );

  // Top-level result must exist and carry a content array
  assert(result !== null && result !== undefined, "result is null/undefined");
  assert(
    Array.isArray(result.content),
    `result.content is not an array — got: ${JSON.stringify(result).slice(0, 200)}`
  );

  const rawParsed = parseFirstJsonBlock(result);
  assert(rawParsed !== null, "Could not parse any JSON from result.content text blocks");

  // Validate pagination/filter structure is present (proves it's a real catalog response)
  assert(
    rawParsed.pagination !== undefined || rawParsed.available_filters !== undefined || Array.isArray(rawParsed.products),
    "Response does not look like a catalog result (missing products / pagination / available_filters)"
  );

  const products = parseProducts(result);

  console.log(`\n  ${YELLOW}Products found: ${products.length}${RESET}`);

  if (products.length === 0) {
    console.log(`  ${YELLOW}Note: query returned 0 results — this store may not carry salicylic-acid products.`);
    console.log(`        The MCP call itself succeeded and returned a valid catalog response.${RESET}`);
  } else {
    for (const p of products) {
      const title = p.title ?? p.name ?? "(no title)";
      const price = p.price_range?.min ?? p.price ?? "N/A";
      const gid   = p.product_id ?? p.id ?? "(no id)";
      console.log(`    - ${title} | $${price} | GID: ${gid}`);
    }

    const first = products[0];
    firstProductGid = first.product_id ?? first.id ?? null;

    assert(first.title || first.name, "First product is missing a title/name");
    assert(
      first.price_range?.min !== undefined || first.price !== undefined,
      "First product is missing price data"
    );
    assert(firstProductGid, "First product has no product_id / id (GID)");

    console.log(`\n  ${YELLOW}First product GID for Test 2: ${firstProductGid}${RESET}`);
  }
});

// ── Test 2: get_product_details ───────────────────────────────────────────────
await runTest("Test 2: get_product_details — using a known product GID", async () => {
  // Use GID from Test 1 when available; fall back to a known GID confirmed via live API.
  const FALLBACK_GID = "gid://shopify/Product/1946154238014"; // Healthy Hair Growth Gift Set
  const gid = firstProductGid ?? FALLBACK_GID;

  console.log(`\n  ${YELLOW}Using GID: ${gid}${RESET}`);

  const result = await callShopifyMCP("get_product_details", { product_id: gid }, 2);

  assert(result !== null && result !== undefined, "result is null/undefined");
  assert(
    Array.isArray(result.content),
    `result.content is not an array — got: ${JSON.stringify(result).slice(0, 200)}`
  );

  // Parse using the correct shape: { product: { ... }, instructions: "..." }
  const product = parseProductDetail(result);

  assert(product !== null, "Could not parse a product object from result.content");

  const title       = product.title ?? product.name;
  const description = product.description ?? product.body_html ?? "";
  const price       = product.price_range?.min ?? product.price;
  const imageUrl    = product.image_url ?? product.images?.[0]?.url ?? product.images?.[0] ?? "";
  const productUrl  = product.url ?? product.product_url ?? "";

  console.log(`\n  ${YELLOW}Product details:${RESET}`);
  console.log(`    Title:       ${title}`);
  console.log(`    Price:       $${price}`);
  console.log(`    Image URL:   ${imageUrl || "(none)"}`);
  console.log(`    Product URL: ${productUrl || "(none)"}`);
  console.log(`    Description: ${String(description).slice(0, 140)}…`);

  assert(title,  "Product is missing title/name");
  assert(price !== undefined && price !== null, "Product is missing price");
  assert(productUrl, "Product is missing a URL");

  // Image is expected but log a warning rather than failing if absent
  if (!imageUrl) {
    console.log(`  ${YELLOW}  Warning: no image URL found${RESET}`);
  }
});

// ── Test 3: search_shop_policies_and_faqs ────────────────────────────────────
await runTest("Test 3: search_shop_policies_and_faqs — store name and return policy", async () => {
  const result = await callShopifyMCP(
    "search_shop_policies_and_faqs",
    { query: "What is the store name and return policy?" },
    3
  );

  assert(result !== null && result !== undefined, "result is null/undefined");

  const parsed = parseFirstJsonBlock(result);

  console.log(`\n  ${YELLOW}Policy/FAQ response:${RESET}`);

  if (Array.isArray(parsed)) {
    for (const entry of parsed) {
      console.log(`\n    Q: ${entry.question}`);
      console.log(`    A: ${String(entry.answer ?? "").slice(0, 300)}`);
    }

    assert(parsed.length > 0, "Policies/FAQs response array is empty");

    // Every entry should have at least a question or an answer
    const hasContent = parsed.every(
      (e) => e.question || e.answer || e.content || e.text
    );
    assert(hasContent, "One or more FAQ entries are missing both question and answer");

    // Verify the return policy is mentioned (store's known policy is about 30-day window)
    const fullText = parsed.map((e) => `${e.question ?? ""} ${e.answer ?? ""}`).join(" ").toLowerCase();
    const mentionsReturn = fullText.includes("return") || fullText.includes("refund");
    assert(mentionsReturn, "Return policy not found in FAQ response");

    console.log(`\n  ${YELLOW}Total FAQ entries returned: ${parsed.length}${RESET}`);
  } else if (typeof parsed === "string") {
    console.log(`    ${parsed.slice(0, 500)}`);
    assert(parsed.length > 0, "Policy text response is empty");
  } else if (parsed !== null) {
    console.log(`    Raw:`, JSON.stringify(parsed).slice(0, 500));
    assert(typeof parsed === "object", "Unexpected response type");
  } else {
    // Could not parse JSON — log raw text blocks
    for (const block of (result.content ?? [])) {
      if (block.type === "text") {
        console.log(`    ${block.text.slice(0, 500)}`);
      }
    }
    // Only fail if there's genuinely nothing at all
    assert(
      (result.content ?? []).some((b) => b.type === "text" && b.text),
      "No text content returned from policies/FAQs endpoint"
    );
  }
});

// ── Test 4: Full user flow ────────────────────────────────────────────────────
await runTest(
  "Test 4: Full user flow — search oily skin products → pick first → get details → verify recommendation readiness",
  async () => {
    // Step 1: Search for oily skin products
    console.log(`\n  ${YELLOW}Step 1: Searching for "oily skin" products…${RESET}`);

    const searchResult = await callShopifyMCP(
      "search_shop_catalog",
      {
        query: "oily skin",
        context: "User is looking for skincare products for oily skin",
      },
      4
    );

    assert(searchResult !== null, "Search result is null");
    assert(Array.isArray(searchResult.content), "Search result.content is not an array");

    const products = parseProducts(searchResult);
    console.log(`  Found ${products.length} product(s)`);

    assert(products.length > 0, `No products returned for "oily skin" — cannot continue flow`);

    // Step 2: Pick the first product
    const first = products[0];
    const gid   = first.product_id ?? first.id;
    const name  = first.title ?? first.name;

    console.log(`\n  ${YELLOW}Step 2: First product — "${name}" (GID: ${gid})${RESET}`);

    assert(gid,  "First product has no GID");
    assert(name, "First product has no name");

    // Step 3: Fetch full product details
    console.log(`\n  ${YELLOW}Step 3: Fetching product details for GID ${gid}…${RESET}`);

    const detailResult = await callShopifyMCP("get_product_details", { product_id: gid }, 5);

    assert(detailResult !== null, "Detail result is null");
    assert(Array.isArray(detailResult.content), "Detail result.content is not an array");

    // Use parseProductDetail which correctly unwraps { product: { ... } }
    const product = parseProductDetail(detailResult);

    assert(product !== null, "Could not parse product object from detail result");

    // Step 4: Verify fields needed for an LLM recommendation
    const detailTitle = product.title ?? product.name;
    const detailDesc  = product.description ?? product.body_html ?? "";
    const detailPrice = product.price_range?.min ?? product.price;
    const detailUrl   = product.url ?? product.product_url ?? "";

    console.log(`\n  ${YELLOW}Step 4: Recommendation-ready field check:${RESET}`);
    console.log(`    title:       ${detailTitle  ? "present" : "MISSING"} — "${detailTitle}"`);
    console.log(`    description: ${detailDesc   ? `present (${detailDesc.length} chars)` : "MISSING or empty"}`);
    console.log(`    price:       ${detailPrice  !== undefined && detailPrice !== null ? "present" : "MISSING"} — $${detailPrice}`);
    console.log(`    url:         ${detailUrl    ? "present" : "MISSING"}`);

    assert(detailTitle, "Product detail is missing title — cannot generate recommendation");
    assert(
      detailPrice !== undefined && detailPrice !== null,
      "Product detail is missing price — cannot generate recommendation"
    );
    assert(detailUrl, "Product detail is missing product URL");

    if (!detailDesc) {
      console.log(`  ${YELLOW}  Warning: description is empty — recommendation quality will be lower${RESET}`);
    }

    console.log(
      `\n  ${GREEN}Full flow verified — product detail has sufficient data to power a personalized LLM recommendation.${RESET}`
    );
  }
);

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(60)}`);
const statusColour = failed > 0 ? RED : GREEN;
console.log(
  `${BOLD}Results: ${GREEN}${passed} passed${RESET}${BOLD}, ${statusColour}${failed} failed${RESET}`
);
console.log("─".repeat(60));

if (failed > 0) {
  process.exit(1);
}

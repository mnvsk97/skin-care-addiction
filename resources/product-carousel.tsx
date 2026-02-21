import { useState, useRef } from "react";
import {
  McpUseProvider,
  useWidget,
  useWidgetTheme,
  type WidgetMetadata,
} from "mcp-use/react";
import { z } from "zod";

// --- Schema ---

const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  labels: z.array(z.string()),
  product_link: z.string(),
  image_urls: z.array(z.string()),
  price: z.number(),
});

const storeThemeSchema = z.object({
  accent_color: z.string(),
  store_name: z.string(),
}).optional();

const propsSchema = z.object({
  products: z.array(productSchema),
  searchLabels: z.array(z.string()),
  store_theme: storeThemeSchema,
});

export const widgetMetadata: WidgetMetadata = {
  description:
    "Carousel of skincare product recommendations. Click a product to see full details with personalized description.",
  props: propsSchema,
  exposeAsTool: false,
};

type Props = z.infer<typeof propsSchema>;
type Product = z.infer<typeof productSchema>;

// --- Theme hook ---

function useColors(accentColor?: string) {
  const theme = useWidgetTheme();
  const accent = accentColor || (theme === "dark" ? "#e8a87c" : "#c2703e");

  return {
    bg: theme === "dark" ? "#141618" : "#f8f9fa",
    card: theme === "dark" ? "#1e2024" : "#ffffff",
    text: theme === "dark" ? "#e8eaed" : "#2d3136",
    textSecondary: theme === "dark" ? "#9aa0a8" : "#6b7280",
    textMuted: theme === "dark" ? "#6b7280" : "#9ca3af",
    border: theme === "dark" ? "#2a2e34" : "#e5e7eb",
    accent,
    accentSoft: theme === "dark" ? `${accent}cc` : `${accent}dd`,
    accentBg: theme === "dark" ? `${accent}1a` : `${accent}15`,
    accentLight: accent,
    badge: theme === "dark" ? "#2a2e34" : "#f3f4f6",
    badgeText: theme === "dark" ? accent : accent,
    spinner: accent,
    shadow: theme === "dark" ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.06)",
    cardHoverShadow:
      theme === "dark"
        ? "0 8px 28px rgba(0,0,0,0.35)"
        : "0 8px 28px rgba(0,0,0,0.1)",
  };
}

// --- Main Widget ---

export default function ProductCarousel() {
  const { props, isPending, sendFollowUpMessage } = useWidget<Props>();
  const colors = useColors(props?.store_theme?.accent_color);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [clickedId, setClickedId] = useState<string | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div
          style={{
            padding: "48px 20px",
            textAlign: "center",
            color: colors.textSecondary,
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:0.6}50%{opacity:1}}`}</style>
          <div
            style={{
              width: 36,
              height: 36,
              border: `3px solid ${colors.border}`,
              borderTop: `3px solid ${colors.spinner}`,
              borderRadius: "50%",
              margin: "0 auto 16px",
              animation: "spin 1s ease-in-out infinite",
            }}
          />
          <p
            style={{
              margin: 0,
              fontSize: 15,
              fontStyle: "italic",
              animation: "pulse 2s ease-in-out infinite",
            }}
          >
            Curating your perfect skincare picks...
          </p>
        </div>
      </McpUseProvider>
    );
  }

  const handleProductClick = async (product: Product) => {
    setClickedId(product.id);
    try {
      await sendFollowUpMessage(
        `Show me the full details for "${product.name}" (product ID: ${product.id}). ` +
          `Write a personalized recommendation based on my skin concerns from our conversation.`
      );
    } catch {
      // Silently handle if follow-up fails
    } finally {
      setClickedId(null);
    }
  };

  const scrollCarousel = (direction: "left" | "right") => {
    if (!carouselRef.current) return;
    const scrollAmount = 280;
    const newOffset =
      direction === "left"
        ? Math.max(0, scrollOffset - scrollAmount)
        : scrollOffset + scrollAmount;
    carouselRef.current.scrollTo({ left: newOffset, behavior: "smooth" });
    setScrollOffset(newOffset);
  };

  const { products, searchLabels, store_theme } = props;
  const storeName = store_theme?.store_name;

  return (
    <McpUseProvider autoSize>
      <div
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          backgroundColor: colors.bg,
          color: colors.text,
          padding: "24px 0 20px",
        }}
      >
        <style>{`
          @keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
          @keyframes fadeInUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
          @keyframes shimmer{0%{opacity:0.5}50%{opacity:1}100%{opacity:0.5}}
        `}</style>

        {/* Header */}
        <div style={{ padding: "0 20px", marginBottom: 18 }}>
          {storeName && (
            <span
              style={{
                display: "inline-block",
                padding: "3px 10px",
                fontSize: 10,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                borderRadius: 4,
                backgroundColor: colors.accentBg,
                color: colors.accent,
                marginBottom: 10,
              }}
            >
              {storeName}
            </span>
          )}
          <p
            style={{
              margin: "0 0 4px 0",
              fontSize: 12,
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: colors.accentSoft,
            }}
          >
            Picked just for you
          </p>
          <h2
            style={{
              margin: "0 0 10px 0",
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              fontFamily:
                '"Georgia", "Times New Roman", serif',
            }}
          >
            Your Skincare Matches
          </h2>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {searchLabels.map((label) => (
              <span
                key={label}
                style={{
                  display: "inline-block",
                  padding: "4px 12px",
                  fontSize: 11,
                  fontWeight: 500,
                  borderRadius: 20,
                  backgroundColor: colors.accentBg,
                  color: colors.badgeText,
                  letterSpacing: "0.01em",
                }}
              >
                {label}
              </span>
            ))}
          </div>
          <p
            style={{
              margin: "10px 0 0",
              fontSize: 13,
              color: colors.textSecondary,
              fontStyle: "italic",
            }}
          >
            {products.length} product{products.length !== 1 ? "s" : ""}{" "}
            tailored to your skin — tap any to learn more
          </p>
        </div>

        {/* Carousel */}
        <div style={{ position: "relative" }}>
          {/* Left arrow */}
          <button
            onClick={() => scrollCarousel("left")}
            aria-label="Scroll left"
            style={{
              position: "absolute",
              left: 6,
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 2,
              width: 34,
              height: 34,
              borderRadius: "50%",
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.card,
              color: colors.text,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              boxShadow: `0 2px 10px ${colors.shadow}`,
              transition: "transform 0.15s",
            }}
          >
            &#8249;
          </button>

          {/* Right arrow */}
          <button
            onClick={() => scrollCarousel("right")}
            aria-label="Scroll right"
            style={{
              position: "absolute",
              right: 6,
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 2,
              width: 34,
              height: 34,
              borderRadius: "50%",
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.card,
              color: colors.text,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              boxShadow: `0 2px 10px ${colors.shadow}`,
              transition: "transform 0.15s",
            }}
          >
            &#8250;
          </button>

          {/* Scrollable track */}
          <div
            ref={carouselRef}
            onScroll={(e) =>
              setScrollOffset((e.target as HTMLDivElement).scrollLeft)
            }
            style={{
              display: "flex",
              gap: 16,
              overflowX: "auto",
              padding: "4px 20px 16px",
              scrollbarWidth: "none",
              scrollBehavior: "smooth",
            }}
          >
            {products.map((product, i) => (
              <div
                key={product.id}
                onClick={() => handleProductClick(product)}
                style={{
                  flex: "0 0 240px",
                  backgroundColor: colors.card,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 14,
                  overflow: "hidden",
                  cursor: clickedId === product.id ? "wait" : "pointer",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  animation: `fadeInUp 0.4s ease-out ${i * 0.06}s both`,
                  opacity: clickedId && clickedId !== product.id ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!clickedId) {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.boxShadow = colors.cardHoverShadow;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {/* Product image */}
                <div
                  style={{
                    width: "100%",
                    height: 180,
                    backgroundColor: colors.border,
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  <img
                    src={product.image_urls[0]}
                    alt={product.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      transition: "transform 0.3s ease",
                    }}
                  />
                  {clickedId === product.id && (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        backgroundColor: "rgba(0,0,0,0.4)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          border: "3px solid rgba(255,255,255,0.3)",
                          borderTop: "3px solid #fff",
                          borderRadius: "50%",
                          animation: "spin 0.8s linear infinite",
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Product info */}
                <div style={{ padding: "14px 14px 16px" }}>
                  <h3
                    style={{
                      margin: "0 0 6px",
                      fontSize: 14,
                      fontWeight: 600,
                      lineHeight: 1.3,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {product.name}
                  </h3>

                  <p
                    style={{
                      margin: "0 0 10px",
                      fontSize: 12,
                      color: colors.textSecondary,
                      lineHeight: 1.5,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {product.description}
                  </p>

                  {/* Labels */}
                  <div
                    style={{
                      display: "flex",
                      gap: 4,
                      flexWrap: "wrap",
                      marginBottom: 12,
                    }}
                  >
                    {product.labels.slice(0, 3).map((label) => (
                      <span
                        key={label}
                        style={{
                          fontSize: 10,
                          padding: "2px 8px",
                          borderRadius: 10,
                          backgroundColor: searchLabels.includes(label)
                            ? colors.accentBg
                            : colors.badge,
                          color: searchLabels.includes(label)
                            ? colors.badgeText
                            : colors.textMuted,
                          fontWeight: searchLabels.includes(label) ? 600 : 400,
                        }}
                      >
                        {label}
                      </span>
                    ))}
                    {product.labels.length > 3 && (
                      <span
                        style={{
                          fontSize: 10,
                          padding: "2px 8px",
                          borderRadius: 10,
                          backgroundColor: colors.badge,
                          color: colors.textMuted,
                        }}
                      >
                        +{product.labels.length - 3}
                      </span>
                    )}
                  </div>

                  {/* Price + CTA */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: colors.accent,
                      }}
                    >
                      ${product.price}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: colors.accentLight,
                        fontWeight: 600,
                        ...(clickedId === product.id
                          ? { animation: "shimmer 1.2s ease-in-out infinite" }
                          : {}),
                      }}
                    >
                      {clickedId === product.id
                        ? "Getting details..."
                        : "See why it's for you \u2192"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </McpUseProvider>
  );
}

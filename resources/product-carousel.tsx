import { useState, useRef, useEffect } from "react";
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

const propsSchema = z.object({
  products: z.array(productSchema),
  searchLabels: z.array(z.string()),
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

function useColors() {
  const theme = useWidgetTheme();
  return {
    bg: theme === "dark" ? "#0f0f0f" : "#fafaf9",
    card: theme === "dark" ? "#1a1a1a" : "#ffffff",
    cardHover: theme === "dark" ? "#222222" : "#f7f4f0",
    text: theme === "dark" ? "#e8e4e0" : "#1c1917",
    textSecondary: theme === "dark" ? "#a8a29e" : "#78716c",
    textMuted: theme === "dark" ? "#78716c" : "#a8a29e",
    border: theme === "dark" ? "#2a2a2a" : "#e7e5e4",
    accent: theme === "dark" ? "#c4956a" : "#b45309",
    accentBg: theme === "dark" ? "#2a2015" : "#fef3c7",
    accentLight: theme === "dark" ? "#d4a574" : "#d97706",
    badge: theme === "dark" ? "#1e1e1e" : "#f5f0eb",
    badgeText: theme === "dark" ? "#d4a574" : "#92400e",
    overlay: theme === "dark" ? "rgba(0,0,0,0.85)" : "rgba(0,0,0,0.6)",
    btnPrimary: theme === "dark" ? "#c4956a" : "#b45309",
    btnPrimaryText: "#ffffff",
    close: theme === "dark" ? "#a8a29e" : "#78716c",
    spinner: theme === "dark" ? "#c4956a" : "#b45309",
  };
}

// --- Main Widget ---

export default function ProductCarousel() {
  const { props, isPending, callTool } = useWidget<Props>();
  const colors = useColors();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [personalizedDesc, setPersonalizedDesc] = useState<string | null>(null);
  const [loadingDesc, setLoadingDesc] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Reset personalized description when selecting a new product
  useEffect(() => {
    if (!selectedProduct) {
      setPersonalizedDesc(null);
      setLoadingDesc(false);
    }
  }, [selectedProduct]);

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div
          style={{
            padding: 40,
            textAlign: "center",
            color: colors.textSecondary,
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>
          <div
            style={{
              width: 36,
              height: 36,
              border: `3px solid ${colors.border}`,
              borderTop: `3px solid ${colors.spinner}`,
              borderRadius: "50%",
              margin: "0 auto 16px",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <p style={{ margin: 0, fontSize: 14 }}>
            Finding your perfect products...
          </p>
        </div>
      </McpUseProvider>
    );
  }

  const handleProductClick = async (product: Product) => {
    setSelectedProduct(product);
    setLoadingDesc(true);
    setPersonalizedDesc(null);
    try {
      await callTool("get_personalized_product_description", {
        product_description: `${product.name}: ${product.description}. Targets: ${product.labels.join(", ")}. Price: $${product.price}.`,
      });
    } catch {
      // Fallback if tool call fails
      setPersonalizedDesc(product.description);
    } finally {
      setLoadingDesc(false);
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

  const { products, searchLabels } = props;

  return (
    <McpUseProvider autoSize>
      <div
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          backgroundColor: colors.bg,
          color: colors.text,
          padding: "20px 0",
        }}
      >
        <style>{`
          @keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
          @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        `}</style>

        {/* Header */}
        <div style={{ padding: "0 20px", marginBottom: 16 }}>
          <h2
            style={{
              margin: "0 0 8px 0",
              fontSize: 20,
              fontWeight: 600,
              letterSpacing: "-0.02em",
            }}
          >
            Recommended for you
          </h2>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {searchLabels.map((label) => (
              <span
                key={label}
                style={{
                  display: "inline-block",
                  padding: "3px 10px",
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
              margin: "8px 0 0",
              fontSize: 13,
              color: colors.textSecondary,
            }}
          >
            {products.length} product{products.length !== 1 ? "s" : ""} found
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
              left: 4,
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 2,
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.card,
              color: colors.text,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            &lsaquo;
          </button>

          {/* Right arrow */}
          <button
            onClick={() => scrollCarousel("right")}
            aria-label="Scroll right"
            style={{
              position: "absolute",
              right: 4,
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 2,
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.card,
              color: colors.text,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            &rsaquo;
          </button>

          {/* Scrollable track */}
          <div
            ref={carouselRef}
            onScroll={(e) =>
              setScrollOffset((e.target as HTMLDivElement).scrollLeft)
            }
            style={{
              display: "flex",
              gap: 14,
              overflowX: "auto",
              padding: "4px 20px 12px",
              scrollbarWidth: "none",
              scrollBehavior: "smooth",
            }}
          >
            {products.map((product) => (
              <div
                key={product.id}
                onClick={() => handleProductClick(product)}
                style={{
                  flex: "0 0 240px",
                  backgroundColor: colors.card,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 12,
                  overflow: "hidden",
                  cursor: "pointer",
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow =
                    "0 8px 24px rgba(0,0,0,0.12)";
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
                  }}
                >
                  <img
                    src={product.image_urls[0]}
                    alt={product.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </div>

                {/* Product info */}
                <div style={{ padding: 14 }}>
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
                      lineHeight: 1.4,
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
                      marginBottom: 10,
                    }}
                  >
                    {product.labels.slice(0, 3).map((label) => (
                      <span
                        key={label}
                        style={{
                          fontSize: 10,
                          padding: "2px 7px",
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
                          padding: "2px 7px",
                          borderRadius: 10,
                          backgroundColor: colors.badge,
                          color: colors.textMuted,
                        }}
                      >
                        +{product.labels.length - 3}
                      </span>
                    )}
                  </div>

                  {/* Price */}
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
                        fontWeight: 500,
                      }}
                    >
                      View details &rarr;
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Full-screen Product Detail Overlay */}
        {selectedProduct && (
          <div
            onClick={() => setSelectedProduct(null)}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: colors.overlay,
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
              animation: "fadeIn 0.2s ease-out",
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: colors.card,
                borderRadius: 16,
                maxWidth: 520,
                width: "100%",
                maxHeight: "90vh",
                overflow: "auto",
                boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
              }}
            >
              {/* Close button */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  padding: "12px 16px 0",
                }}
              >
                <button
                  onClick={() => setSelectedProduct(null)}
                  aria-label="Close"
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: 22,
                    cursor: "pointer",
                    color: colors.close,
                    padding: 4,
                    lineHeight: 1,
                  }}
                >
                  &times;
                </button>
              </div>

              {/* Product image */}
              <div
                style={{
                  width: "100%",
                  height: 260,
                  overflow: "hidden",
                  margin: "0 0 0",
                }}
              >
                <img
                  src={selectedProduct.image_urls[0]}
                  alt={selectedProduct.name}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              </div>

              {/* Detail content */}
              <div style={{ padding: "20px 24px 24px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 12,
                  }}
                >
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 22,
                      fontWeight: 700,
                      lineHeight: 1.2,
                      flex: 1,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {selectedProduct.name}
                  </h2>
                  <span
                    style={{
                      fontSize: 24,
                      fontWeight: 700,
                      color: colors.accent,
                      marginLeft: 16,
                      whiteSpace: "nowrap",
                    }}
                  >
                    ${selectedProduct.price}
                  </span>
                </div>

                {/* Labels */}
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    flexWrap: "wrap",
                    marginBottom: 16,
                  }}
                >
                  {selectedProduct.labels.map((label) => (
                    <span
                      key={label}
                      style={{
                        fontSize: 11,
                        padding: "4px 10px",
                        borderRadius: 20,
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
                </div>

                {/* Personalized description area */}
                <div
                  style={{
                    padding: 16,
                    backgroundColor: colors.bg,
                    borderRadius: 10,
                    marginBottom: 20,
                    border: `1px solid ${colors.border}`,
                    minHeight: 80,
                  }}
                >
                  {loadingDesc ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        color: colors.textSecondary,
                      }}
                    >
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          border: `2px solid ${colors.border}`,
                          borderTop: `2px solid ${colors.spinner}`,
                          borderRadius: "50%",
                          animation: "spin 0.8s linear infinite",
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: 13 }}>
                        Crafting your personalized recommendation...
                      </span>
                    </div>
                  ) : (
                    <p
                      style={{
                        margin: 0,
                        fontSize: 14,
                        lineHeight: 1.6,
                        color: colors.text,
                        whiteSpace: "pre-line",
                      }}
                    >
                      {personalizedDesc || selectedProduct.description}
                    </p>
                  )}
                </div>

                {/* CTA */}
                <a
                  href={selectedProduct.product_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "block",
                    textAlign: "center",
                    padding: "12px 24px",
                    backgroundColor: colors.btnPrimary,
                    color: colors.btnPrimaryText,
                    borderRadius: 10,
                    textDecoration: "none",
                    fontSize: 15,
                    fontWeight: 600,
                    letterSpacing: "0.01em",
                    transition: "opacity 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "0.9";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "1";
                  }}
                >
                  Shop Now &mdash; ${selectedProduct.price}
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </McpUseProvider>
  );
}

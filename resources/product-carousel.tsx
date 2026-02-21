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
    bg: theme === "dark" ? "#1a1412" : "#fdf8f4",
    card: theme === "dark" ? "#241e1a" : "#ffffff",
    text: theme === "dark" ? "#f0e8e0" : "#3d2b1f",
    textSecondary: theme === "dark" ? "#b8a898" : "#7a6555",
    textMuted: theme === "dark" ? "#8a7a6a" : "#a89888",
    border: theme === "dark" ? "#3a2e26" : "#efe5db",
    accent: theme === "dark" ? "#e8a87c" : "#c2703e",
    accentSoft: theme === "dark" ? "#d4956a" : "#d4885a",
    accentBg: theme === "dark" ? "#2e2218" : "#fef0e4",
    accentLight: theme === "dark" ? "#e8a87c" : "#c2703e",
    badge: theme === "dark" ? "#2a2220" : "#f7efe8",
    badgeText: theme === "dark" ? "#e8a87c" : "#9a5830",
    spinner: theme === "dark" ? "#e8a87c" : "#c2703e",
    shadow: theme === "dark" ? "rgba(0,0,0,0.3)" : "rgba(150,120,90,0.08)",
    cardHoverShadow:
      theme === "dark"
        ? "0 8px 28px rgba(0,0,0,0.35)"
        : "0 8px 28px rgba(150,120,90,0.15)",
    overlayBg: theme === "dark" ? "rgba(26,20,18,0.96)" : "rgba(253,248,244,0.97)",
    divider: theme === "dark" ? "#3a2e26" : "#efe5db",
  };
}

// --- Match Score helpers ---

function getMatchScore(productLabels: string[], searchLabels: string[]): number {
  const normalizedSearch = searchLabels.map((l) => l.toLowerCase());
  return productLabels.filter((l) => normalizedSearch.includes(l.toLowerCase()))
    .length;
}

// --- Match Score Badge ---

function MatchBadge({
  score,
  total,
  colors,
}: {
  score: number;
  total: number;
  colors: ReturnType<typeof useColors>;
}) {
  if (total === 0) return null;
  const isHighMatch = score >= Math.ceil(total / 2);
  return (
    <div
      style={{
        position: "absolute",
        top: 8,
        right: 8,
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 8px",
        borderRadius: 20,
        backgroundColor: isHighMatch
          ? colors.accent
          : "rgba(0,0,0,0.45)",
        color: isHighMatch ? "#fff" : "rgba(255,255,255,0.85)",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.02em",
        backdropFilter: "blur(4px)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      }}
    >
      <span style={{ fontSize: 8 }}>{"★".repeat(Math.min(score, 3))}</span>
      {score}/{total}
    </div>
  );
}

// --- Full-Screen Detail Overlay ---

function ProductDetailOverlay({
  product,
  searchLabels,
  colors,
  onClose,
  onShopNow,
}: {
  product: Product;
  searchLabels: string[];
  colors: ReturnType<typeof useColors>;
  onClose: () => void;
  onShopNow: (url: string) => void;
}) {
  const normalizedSearch = searchLabels.map((l) => l.toLowerCase());
  const matchScore = getMatchScore(product.labels, searchLabels);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 10,
        backgroundColor: colors.overlayBg,
        overflowY: "auto",
        animation: "overlayFadeIn 0.22s ease-out both",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        aria-label="Close detail view"
        style={{
          position: "sticky",
          top: 12,
          alignSelf: "flex-start",
          marginLeft: 12,
          zIndex: 11,
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
          lineHeight: 1,
          boxShadow: `0 2px 10px ${colors.shadow}`,
          flexShrink: 0,
        }}
      >
        &#8592;
      </button>

      {/* Content */}
      <div
        style={{
          animation: "overlaySlideUp 0.28s ease-out both",
          padding: "0 20px 28px",
        }}
      >
        {/* Hero image */}
        <div
          style={{
            width: "100%",
            borderRadius: 14,
            overflow: "hidden",
            marginBottom: 20,
            backgroundColor: colors.border,
            aspectRatio: "4/3",
          }}
        >
          <img
            src={product.image_urls[0]}
            alt={product.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        </div>

        {/* Name + price row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
            marginBottom: 14,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 700,
              lineHeight: 1.25,
              fontFamily: '"Georgia", "Times New Roman", serif',
              color: colors.text,
              flex: 1,
            }}
          >
            {product.name}
          </h2>
          <span
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: colors.accent,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            ${product.price}
          </span>
        </div>

        {/* Match score pill */}
        {searchLabels.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 12px",
                borderRadius: 20,
                backgroundColor: matchScore > 0 ? colors.accentBg : colors.badge,
                color: matchScore > 0 ? colors.badgeText : colors.textMuted,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <span style={{ fontSize: 13 }}>
                {"★".repeat(matchScore)}{"☆".repeat(Math.max(0, searchLabels.length - matchScore))}
              </span>
              {matchScore}/{searchLabels.length} match with your search
            </span>
          </div>
        )}

        {/* Description */}
        <p
          style={{
            margin: "0 0 18px",
            fontSize: 14,
            lineHeight: 1.65,
            color: colors.textSecondary,
          }}
        >
          {product.description}
        </p>

        {/* Divider */}
        <div
          style={{
            height: 1,
            backgroundColor: colors.divider,
            marginBottom: 16,
          }}
        />

        {/* All labels */}
        <p
          style={{
            margin: "0 0 8px",
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: colors.textMuted,
          }}
        >
          Key Benefits
        </p>
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            marginBottom: 24,
          }}
        >
          {product.labels.map((label) => {
            const isMatch = normalizedSearch.includes(label.toLowerCase());
            return (
              <span
                key={label}
                style={{
                  fontSize: 11,
                  padding: "4px 10px",
                  borderRadius: 12,
                  backgroundColor: isMatch ? colors.accentBg : colors.badge,
                  color: isMatch ? colors.badgeText : colors.textMuted,
                  fontWeight: isMatch ? 600 : 400,
                  border: isMatch ? `1px solid ${colors.accent}30` : "1px solid transparent",
                }}
              >
                {isMatch && <span style={{ marginRight: 3 }}>✓</span>}
                {label}
              </span>
            );
          })}
        </div>

        {/* Shop Now CTA */}
        <button
          onClick={() => onShopNow(product.product_link)}
          style={{
            width: "100%",
            padding: "14px 20px",
            borderRadius: 12,
            border: "none",
            backgroundColor: colors.accent,
            color: "#fff",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
            letterSpacing: "0.02em",
            boxShadow: `0 4px 16px ${colors.accent}55`,
            transition: "opacity 0.15s, transform 0.15s",
            fontFamily: '"Georgia", "Times New Roman", serif',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.9";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          Shop Now &rarr;
        </button>
      </div>
    </div>
  );
}

// --- Main Widget ---

export default function ProductCarousel() {
  const { props, isPending, sendFollowUpMessage, openExternal } = useWidget<Props>();
  const colors = useColors();
  const [scrollOffset, setScrollOffset] = useState(0);
  const [clickedId, setClickedId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
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
              '"Georgia", "Times New Roman", serif',
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
    setSelectedProduct(product);
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

  const handleCloseOverlay = () => {
    setSelectedProduct(null);
  };

  const handleShopNow = (url: string) => {
    openExternal(url);
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
          padding: "24px 0 20px",
          position: "relative",
        }}
      >
        <style>{`
          @keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
          @keyframes fadeInUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
          @keyframes shimmer{0%{opacity:0.5}50%{opacity:1}100%{opacity:0.5}}
          @keyframes overlayFadeIn{from{opacity:0}to{opacity:1}}
          @keyframes overlaySlideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        `}</style>

        {/* Full-screen product detail overlay */}
        {selectedProduct && (
          <ProductDetailOverlay
            product={selectedProduct}
            searchLabels={searchLabels}
            colors={colors}
            onClose={handleCloseOverlay}
            onShopNow={handleShopNow}
          />
        )}

        {/* Header */}
        <div style={{ padding: "0 20px", marginBottom: 18 }}>
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
            {products.map((product, i) => {
              const matchScore = getMatchScore(product.labels, searchLabels);
              return (
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

                    {/* Match score badge */}
                    <MatchBadge
                      score={matchScore}
                      total={searchLabels.length}
                      colors={colors}
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
                      {product.labels.slice(0, 3).map((label) => {
                        const isMatch = searchLabels
                          .map((l) => l.toLowerCase())
                          .includes(label.toLowerCase());
                        return (
                          <span
                            key={label}
                            style={{
                              fontSize: 10,
                              padding: "2px 8px",
                              borderRadius: 10,
                              backgroundColor: isMatch
                                ? colors.accentBg
                                : colors.badge,
                              color: isMatch
                                ? colors.badgeText
                                : colors.textMuted,
                              fontWeight: isMatch ? 600 : 400,
                            }}
                          >
                            {label}
                          </span>
                        );
                      })}
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
              );
            })}
          </div>
        </div>
      </div>
    </McpUseProvider>
  );
}

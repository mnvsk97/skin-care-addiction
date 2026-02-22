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
  userPreferences: z.string().optional(),
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
    cardInner: theme === "dark" ? "#1e1814" : "#faf5ef",
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
    divider: theme === "dark" ? "#3a2e26" : "#efe5db",
    quoteBar: theme === "dark" ? "#e8a87c" : "#d4885a",
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

// --- Recommendation Skeleton ---

function RecommendationSkeleton({ colors }: { colors: ReturnType<typeof useColors> }) {
  const shimmerBg =
    colors.bg === "#1a1412"
      ? "linear-gradient(90deg, #241e1a 0%, #2e2822 40%, #241e1a 80%)"
      : "linear-gradient(90deg, #efe5db 0%, #f7efe8 40%, #efe5db 80%)";

  return (
    <div
      style={{
        padding: "18px 20px",
        backgroundColor: colors.cardInner,
        borderRadius: 12,
        borderLeft: `3px solid ${colors.quoteBar}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            border: `2px solid ${colors.border}`,
            borderTop: `2px solid ${colors.spinner}`,
            borderRadius: "50%",
            animation: "spin 1s ease-in-out infinite",
          }}
        />
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: colors.accent,
            animation: "pulse 2s ease-in-out infinite",
          }}
        >
          Analyzing for your skin...
        </span>
      </div>
      {[100, 90, 75].map((pct, i) => (
        <div
          key={i}
          style={{
            width: `${pct}%`,
            height: 12,
            borderRadius: 6,
            background: shimmerBg,
            backgroundSize: "800px 12px",
            animation: `shimmerSlide 1.8s ease-in-out ${i * 0.15}s infinite`,
            marginBottom: i < 2 ? 10 : 0,
          }}
        />
      ))}
    </div>
  );
}

// --- Full-Screen Detail View ---

function ProductDetailView({
  product,
  searchLabels,
  colors,
  recommendation,
  recommendedRoutine,
  isLoadingRec,
  similarProducts,
  onClose,
  onShopNow,
  onProductClick,
}: {
  product: Product;
  searchLabels: string[];
  colors: ReturnType<typeof useColors>;
  recommendation: string | null;
  recommendedRoutine: string | null;
  isLoadingRec: boolean;
  similarProducts: Array<{ id: string; name: string; image_url: string; price: string; labels: string[] }>;
  onClose: () => void;
  onShopNow: (url: string) => void;
  onProductClick: (id: string, name: string) => void;
}) {
  const normalizedSearch = searchLabels.map((l) => l.toLowerCase());
  const matchScore = getMatchScore(product.labels, searchLabels);
  const paragraphs = recommendation
    ? recommendation.split("\n\n").filter((p) => p.trim())
    : [];
  const routineParagraphs = recommendedRoutine
    ? recommendedRoutine.split("\n\n").filter((p) => p.trim())
    : [];

  return (
    <div
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        backgroundColor: colors.bg,
        color: colors.text,
        animation: "overlayFadeIn 0.22s ease-out both",
      }}
    >
      {/* Back button */}
      <div style={{ padding: "16px 20px 0" }}>
        <button
          onClick={onClose}
          aria-label="Back to results"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            borderRadius: 20,
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.card,
            color: colors.textSecondary,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 500,
            boxShadow: `0 2px 8px ${colors.shadow}`,
            transition: "background-color 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = colors.badge;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = colors.card;
          }}
        >
          &#8592; Back to results
        </button>
      </div>

      {/* Hero image */}
      <div
        style={{
          margin: "16px 20px 0",
          borderRadius: 14,
          overflow: "hidden",
          backgroundColor: colors.border,
        }}
      >
        <img
          src={product.image_urls[0]}
          alt={product.name}
          style={{
            width: "100%",
            aspectRatio: "4/3",
            objectFit: "cover",
            display: "block",
          }}
        />
      </div>

      {/* Content */}
      <div
        style={{
          padding: "20px 20px 28px",
          animation: "overlaySlideUp 0.28s ease-out both",
        }}
      >
        {/* Eyebrow */}
        <p
          style={{
            margin: "0 0 6px 0",
            fontSize: 11,
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: colors.accent,
          }}
        >
          Personalized for you
        </p>

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
              fontSize: 22,
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
              fontSize: 24,
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
          <div style={{ marginBottom: 16 }}>
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
                {"★".repeat(matchScore)}
                {"☆".repeat(Math.max(0, searchLabels.length - matchScore))}
              </span>
              {matchScore}/{searchLabels.length} match
            </span>
          </div>
        )}

        {/* All labels */}
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            marginBottom: 20,
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
                  border: isMatch
                    ? `1px solid ${colors.accent}30`
                    : "1px solid transparent",
                }}
              >
                {isMatch && <span style={{ marginRight: 3 }}>✓</span>}
                {label}
              </span>
            );
          })}
        </div>

        {/* Personalized recommendation or skeleton */}
        {isLoadingRec ? (
          <div style={{ marginBottom: 22 }}>
            <RecommendationSkeleton colors={colors} />
          </div>
        ) : recommendation ? (
          <div
            style={{
              padding: "18px 20px",
              backgroundColor: colors.cardInner,
              borderRadius: 12,
              marginBottom: 22,
              borderLeft: `3px solid ${colors.quoteBar}`,
              animation: "overlayFadeIn 0.4s ease-out",
            }}
          >
            <p
              style={{
                margin: "0 0 8px 0",
                fontSize: 12,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: colors.accent,
              }}
            >
              Personalized Recommendation
            </p>
            {paragraphs.map((paragraph, i) => (
              <p
                key={i}
                style={{
                  margin: i === paragraphs.length - 1 ? 0 : "0 0 12px 0",
                  fontSize: 14,
                  lineHeight: 1.75,
                  color: colors.text,
                }}
              >
                {paragraph.trim()}
              </p>
            ))}
          </div>
        ) : (
          /* Fallback: show product description if recommendation failed */
          <p
            style={{
              margin: "0 0 20px",
              fontSize: 14,
              lineHeight: 1.7,
              color: colors.textSecondary,
            }}
          >
            {product.description}
          </p>
        )}

        {/* Recommended Routine */}
        {!isLoadingRec && recommendedRoutine && (
          <div
            style={{
              padding: "18px 20px",
              backgroundColor: colors.cardInner,
              borderRadius: 12,
              marginBottom: 22,
              borderLeft: `3px solid ${colors.accent}`,
              animation: "overlayFadeIn 0.4s ease-out 0.1s both",
            }}
          >
            <p
              style={{
                margin: "0 0 8px 0",
                fontSize: 12,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: colors.accentSoft,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ fontSize: 14 }}>&#128337;</span>
              Recommended Routine
            </p>
            {routineParagraphs.map((paragraph, i) => (
              <p
                key={i}
                style={{
                  margin: i === routineParagraphs.length - 1 ? 0 : "0 0 12px 0",
                  fontSize: 14,
                  lineHeight: 1.75,
                  color: colors.text,
                  whiteSpace: "pre-line",
                }}
              >
                {paragraph.trim()}
              </p>
            ))}
          </div>
        )}

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
          Shop Now &mdash; ${product.price}
        </button>

        {/* You Might Also Like */}
        {similarProducts.length > 0 && (
          <div style={{ animation: "overlayFadeIn 0.5s ease-out 0.3s both" }}>
            <div
              style={{
                height: 1,
                backgroundColor: colors.divider,
                margin: "24px 0",
              }}
            />
            <h3
              style={{
                margin: "0 0 14px 0",
                fontSize: 16,
                fontWeight: 600,
                fontFamily: '"Georgia", "Times New Roman", serif',
                color: colors.text,
              }}
            >
              You Might Also Like
            </h3>
            <div
              style={{
                display: "flex",
                gap: 10,
                overflowX: "auto",
                scrollbarWidth: "none",
              }}
            >
              {similarProducts.map((sp) => (
                <div
                  key={sp.id}
                  onClick={() => onProductClick(sp.id, sp.name)}
                  style={{
                    flex: "0 0 120px",
                    cursor: "pointer",
                    borderRadius: 10,
                    overflow: "hidden",
                    backgroundColor: colors.card,
                    border: `1px solid ${colors.border}`,
                    transition: "transform 0.2s, box-shadow 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = `0 4px 12px ${colors.shadow}`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div
                    style={{
                      width: 120,
                      height: 120,
                      overflow: "hidden",
                      backgroundColor: colors.border,
                    }}
                  >
                    {sp.image_url && (
                      <img
                        src={sp.image_url}
                        alt={sp.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    )}
                  </div>
                  <div style={{ padding: "8px 10px" }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 11,
                        fontWeight: 500,
                        color: colors.text,
                        lineHeight: 1.3,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {sp.name}
                    </p>
                    <p
                      style={{
                        margin: "4px 0 0 0",
                        fontSize: 13,
                        fontWeight: 600,
                        color: colors.accent,
                      }}
                    >
                      ${sp.price}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Main Widget ---

export default function ProductCarousel() {
  const { props, isPending, callTool, openExternal } = useWidget<Props>();
  const colors = useColors();
  const [scrollOffset, setScrollOffset] = useState(0);
  const [clickedId, setClickedId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [recommendedRoutine, setRecommendedRoutine] = useState<string | null>(null);
  const [isLoadingRec, setIsLoadingRec] = useState(false);
  const [similarProducts, setSimilarProducts] = useState<
    Array<{ id: string; name: string; image_url: string; price: string; labels: string[] }>
  >([]);
  const carouselRef = useRef<HTMLDivElement>(null);

  const { products, searchLabels, userPreferences } = props ?? { products: [], searchLabels: [], userPreferences: "" };

  // Fetch personalized recommendation when a product is selected
  useEffect(() => {
    if (!selectedProduct) return;

    let cancelled = false;
    setIsLoadingRec(true);
    setRecommendation(null);
    setRecommendedRoutine(null);
    setSimilarProducts([]);

    const userPrefs = userPreferences || `User is searching for products targeting: ${searchLabels.join(", ")}.`;

    callTool("product-detail", {
      product_id: Number(selectedProduct.id),
      user_preferences: userPrefs,
    })
      .then((result: any) => {
        if (cancelled) return;
        // structuredContent holds widget props directly (not nested under .props)
        const content = result?.structuredContent;
        if (content?.personalized_description) {
          setRecommendation(content.personalized_description as string);
        }
        if (content?.recommended_routine) {
          setRecommendedRoutine(content.recommended_routine as string);
        }
        if (content?.similar_products) {
          setSimilarProducts(content.similar_products as any);
        }
      })
      .catch((err: any) => {
        console.error("product-detail callTool error:", err);
        if (!cancelled) setRecommendation(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingRec(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedProduct?.id]);

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div
          style={{
            padding: "48px 20px",
            textAlign: "center",
            color: colors.textSecondary,
            fontFamily: '"Georgia", "Times New Roman", serif',
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

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setClickedId(product.id);
  };

  const handleSimilarProductClick = (id: string, name: string) => {
    // Find the product in our list, or create a minimal version
    const found = products.find((p) => p.id === id);
    if (found) {
      setSelectedProduct(found);
      setClickedId(found.id);
    }
  };

  const handleCloseOverlay = () => {
    setSelectedProduct(null);
    setClickedId(null);
    setRecommendation(null);
    setRecommendedRoutine(null);
    setSimilarProducts([]);
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

  // When a product is selected, show the detail view instead of the carousel
  if (selectedProduct) {
    return (
      <McpUseProvider autoSize>
        <style>{`
          @keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
          @keyframes pulse{0%,100%{opacity:0.5}50%{opacity:1}}
          @keyframes shimmerSlide{0%{background-position:-400px 0}100%{background-position:400px 0}}
          @keyframes overlayFadeIn{from{opacity:0}to{opacity:1}}
          @keyframes overlaySlideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        `}</style>
        <ProductDetailView
          product={selectedProduct}
          searchLabels={searchLabels}
          colors={colors}
          recommendation={recommendation}
          recommendedRoutine={recommendedRoutine}
          isLoadingRec={isLoadingRec}
          similarProducts={similarProducts}
          onClose={handleCloseOverlay}
          onShopNow={handleShopNow}
          onProductClick={handleSimilarProductClick}
        />
      </McpUseProvider>
    );
  }

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
              fontFamily: '"Georgia", "Times New Roman", serif',
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
                    cursor: "pointer",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    animation: `fadeInUp 0.4s ease-out ${i * 0.06}s both`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.boxShadow = colors.cardHoverShadow;
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
                    <MatchBadge
                      score={matchScore}
                      total={searchLabels.length}
                      colors={colors}
                    />
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
                        }}
                      >
                        See why it's for you →
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

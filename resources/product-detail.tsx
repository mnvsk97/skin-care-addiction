import {
  McpUseProvider,
  useWidget,
  useWidgetTheme,
  type WidgetMetadata,
} from "mcp-use/react";
import { z } from "zod";

const propsSchema = z.object({
  product_id: z.number(),
  product_name: z.string(),
  personalized_description: z.string(),
  labels: z.string(),
  image_links: z.string(),
  product_link: z.string(),
  price: z.string(),
  similar_products: z.array(z.object({
    id: z.string(),
    name: z.string(),
    image_url: z.string(),
    price: z.string(),
    labels: z.array(z.string()),
  })).optional(),
});

export const widgetMetadata: WidgetMetadata = {
  description:
    "Displays full skincare product details with personalized recommendation.",
  props: propsSchema,
  exposeAsTool: false,
};

type Props = z.infer<typeof propsSchema>;

function useColors() {
  const theme = useWidgetTheme();
  return {
    bg: theme === "dark" ? "#1a1412" : "#fdf8f4",
    card: theme === "dark" ? "#241e1a" : "#ffffff",
    cardInner: theme === "dark" ? "#1e1814" : "#faf5ef",
    text: theme === "dark" ? "#f0e8e0" : "#3d2b1f",
    textSecondary: theme === "dark" ? "#b8a898" : "#7a6555",
    border: theme === "dark" ? "#3a2e26" : "#efe5db",
    accent: theme === "dark" ? "#e8a87c" : "#c2703e",
    accentBg: theme === "dark" ? "#2e2218" : "#fef0e4",
    badgeText: theme === "dark" ? "#e8a87c" : "#9a5830",
    btnPrimary: theme === "dark" ? "#e8a87c" : "#c2703e",
    btnPrimaryHover: theme === "dark" ? "#f0b88c" : "#a85c30",
    btnPrimaryText: "#ffffff",
    spinner: theme === "dark" ? "#e8a87c" : "#c2703e",
    quoteBar: theme === "dark" ? "#e8a87c" : "#d4885a",
    shadow: theme === "dark" ? "rgba(0,0,0,0.3)" : "rgba(150,120,90,0.1)",
  };
}

export default function ProductDetail() {
  const { props, isPending, openExternal, sendFollowUpMessage } = useWidget<Props>();
  const colors = useColors();

  if (isPending) {
    const shimmerBg = colors.bg === "#1a1412"
      ? "linear-gradient(90deg, #241e1a 0%, #2e2822 40%, #241e1a 80%)"
      : "linear-gradient(90deg, #efe5db 0%, #f7efe8 40%, #efe5db 80%)";

    return (
      <McpUseProvider autoSize>
        <style>{`
          @keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
          @keyframes pulse{0%,100%{opacity:0.5}50%{opacity:1}}
          @keyframes shimmerSlide{0%{background-position:-400px 0}100%{background-position:400px 0}}
        `}</style>
        <div
          style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            backgroundColor: colors.bg,
            borderRadius: 16,
            overflow: "hidden",
            border: `1px solid ${colors.border}`,
            boxShadow: `0 4px 20px ${colors.shadow}`,
          }}
        >
          {/* Skeleton image */}
          <div
            style={{
              width: "100%",
              height: 280,
              background: shimmerBg,
              backgroundSize: "800px 280px",
              animation: "shimmerSlide 1.8s ease-in-out infinite",
              position: "relative",
            }}
          >
            {/* Spinner centered on image area */}
            <div style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
            }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  border: `3px solid ${colors.border}`,
                  borderTop: `3px solid ${colors.spinner}`,
                  borderRadius: "50%",
                  animation: "spin 1s ease-in-out infinite",
                }}
              />
              <p style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 500,
                color: colors.textSecondary,
                animation: "pulse 2s ease-in-out infinite",
              }}>
                Analyzing this product for your skin...
              </p>
            </div>
          </div>

          {/* Skeleton content */}
          <div style={{ padding: "16px 24px 28px" }}>
            {/* Eyebrow skeleton */}
            <div style={{
              width: 120,
              height: 10,
              borderRadius: 5,
              background: shimmerBg,
              backgroundSize: "800px 10px",
              animation: "shimmerSlide 1.8s ease-in-out infinite",
              marginBottom: 10,
            }} />

            {/* Title + price row skeleton */}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{
                width: "65%",
                height: 22,
                borderRadius: 6,
                background: shimmerBg,
                backgroundSize: "800px 22px",
                animation: "shimmerSlide 1.8s ease-in-out infinite",
              }} />
              <div style={{
                width: 60,
                height: 22,
                borderRadius: 6,
                background: shimmerBg,
                backgroundSize: "800px 22px",
                animation: "shimmerSlide 1.8s ease-in-out infinite",
              }} />
            </div>

            {/* Label skeletons */}
            <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
              {[70, 85, 60].map((w, i) => (
                <div key={i} style={{
                  width: w,
                  height: 24,
                  borderRadius: 20,
                  background: shimmerBg,
                  backgroundSize: "800px 24px",
                  animation: `shimmerSlide 1.8s ease-in-out ${i * 0.1}s infinite`,
                }} />
              ))}
            </div>

            {/* Description skeleton */}
            <div style={{
              padding: "18px 20px",
              backgroundColor: colors.cardInner,
              borderRadius: 12,
              marginBottom: 22,
              borderLeft: `3px solid ${colors.quoteBar}`,
            }}>
              <div style={{
                width: 180,
                height: 10,
                borderRadius: 5,
                background: shimmerBg,
                backgroundSize: "800px 10px",
                animation: "shimmerSlide 1.8s ease-in-out infinite",
                marginBottom: 14,
              }} />
              {[100, 90, 70].map((pct, i) => (
                <div key={i} style={{
                  width: `${pct}%`,
                  height: 12,
                  borderRadius: 6,
                  background: shimmerBg,
                  backgroundSize: "800px 12px",
                  animation: `shimmerSlide 1.8s ease-in-out ${i * 0.15}s infinite`,
                  marginBottom: i < 2 ? 10 : 0,
                }} />
              ))}
            </div>

            {/* Button skeleton */}
            <div style={{
              width: "100%",
              height: 48,
              borderRadius: 12,
              background: shimmerBg,
              backgroundSize: "800px 48px",
              animation: "shimmerSlide 1.8s ease-in-out infinite",
            }} />
          </div>
        </div>
      </McpUseProvider>
    );
  }

  const labels = props.labels
    .split(",")
    .map((l) => l.trim())
    .filter(Boolean);

  // Split description into paragraphs for nicer rendering
  const paragraphs = props.personalized_description
    .split("\n\n")
    .filter((p) => p.trim());

  return (
    <McpUseProvider autoSize>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          backgroundColor: colors.bg,
          color: colors.text,
          borderRadius: 16,
          overflow: "hidden",
          border: `1px solid ${colors.border}`,
          boxShadow: `0 4px 20px ${colors.shadow}`,
          animation: "fadeIn 0.4s ease-out",
        }}
      >
        {/* Product image */}
        {props.image_links && (
          <div
            style={{
              width: "100%",
              height: 280,
              overflow: "hidden",
              backgroundColor: colors.border,
              position: "relative",
            }}
          >
            <img
              src={props.image_links}
              alt={props.product_name}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
            {/* Gradient overlay at bottom of image */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: 60,
                background: `linear-gradient(transparent, ${colors.bg})`,
              }}
            />
          </div>
        )}

        {/* Content */}
        <div style={{ padding: "16px 24px 28px" }}>
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

          {/* Name and price */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 14,
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 24,
                fontWeight: 700,
                lineHeight: 1.2,
                flex: 1,
                letterSpacing: "-0.02em",
                fontFamily: '"Georgia", "Times New Roman", serif',
              }}
            >
              {props.product_name}
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
              ${props.price}
            </span>
          </div>

          {/* Labels */}
          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              marginBottom: 20,
            }}
          >
            {labels.map((label) => (
              <span
                key={label}
                style={{
                  fontSize: 11,
                  padding: "4px 12px",
                  borderRadius: 20,
                  backgroundColor: colors.accentBg,
                  color: colors.badgeText,
                  fontWeight: 500,
                }}
              >
                {label}
              </span>
            ))}
          </div>

          {/* Personalized description */}
          <div
            style={{
              padding: "18px 20px",
              backgroundColor: colors.cardInner,
              borderRadius: 12,
              marginBottom: 22,
              borderLeft: `3px solid ${colors.quoteBar}`,
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
              Why we recommend this for you
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

          {/* CTA */}
          <button
            onClick={() => openExternal(props.product_link)}
            style={{
              display: "block",
              width: "100%",
              textAlign: "center",
              padding: "14px 24px",
              backgroundColor: colors.btnPrimary,
              color: colors.btnPrimaryText,
              borderRadius: 12,
              border: "none",
              fontSize: 15,
              fontWeight: 600,
              letterSpacing: "0.01em",
              cursor: "pointer",
              transition: "background-color 0.2s, transform 0.1s",
              boxShadow: `0 2px 8px ${colors.shadow}`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.btnPrimaryHover;
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = colors.btnPrimary;
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            Shop Now — ${props.price}
          </button>

          {/* You Might Also Like */}
          {props.similar_products && props.similar_products.length > 0 && (
            <div style={{ animation: "fadeIn 0.5s ease-out 0.2s both" }}>
              <div
                style={{
                  height: 1,
                  backgroundColor: colors.border,
                  margin: "24px 0",
                }}
              />
              <h3
                style={{
                  margin: "0 0 16px 0",
                  fontSize: 18,
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
                }}
              >
                {props.similar_products.map((product) => (
                  <div
                    key={product.id}
                    onClick={() =>
                      sendFollowUpMessage(
                        `Show me the full details for "${product.name}" (product ID: ${product.id}). Write a personalized recommendation based on my skin concerns.`
                      )
                    }
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
                      {product.image_url && (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      )}
                    </div>
                    <div style={{ padding: "8px 10px" }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 12,
                          fontWeight: 500,
                          color: colors.text,
                          lineHeight: 1.3,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {product.name}
                      </p>
                      <p
                        style={{
                          margin: "4px 0 0 0",
                          fontSize: 13,
                          fontWeight: 600,
                          color: colors.accent,
                        }}
                      >
                        ${product.price}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </McpUseProvider>
  );
}

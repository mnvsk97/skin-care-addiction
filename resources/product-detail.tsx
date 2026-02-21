import {
  McpUseProvider,
  useWidget,
  useWidgetTheme,
  type WidgetMetadata,
} from "mcp-use/react";
import { z } from "zod";

const storeThemeSchema = z.object({
  accent_color: z.string(),
  store_name: z.string(),
}).optional();

const propsSchema = z.object({
  product_id: z.string(),
  product_name: z.string(),
  personalized_description: z.string(),
  labels: z.string(),
  image_links: z.string(),
  product_link: z.string(),
  price: z.string(),
  store_theme: storeThemeSchema,
});

export const widgetMetadata: WidgetMetadata = {
  description:
    "Displays full skincare product details with personalized recommendation.",
  props: propsSchema,
  exposeAsTool: false,
};

type Props = z.infer<typeof propsSchema>;

function useColors(accentColor?: string) {
  const theme = useWidgetTheme();
  const accent = accentColor || (theme === "dark" ? "#e8a87c" : "#c2703e");

  return {
    bg: theme === "dark" ? "#141618" : "#f8f9fa",
    card: theme === "dark" ? "#1e2024" : "#ffffff",
    cardInner: theme === "dark" ? "#1a1c20" : "#f5f6f8",
    text: theme === "dark" ? "#e8eaed" : "#2d3136",
    textSecondary: theme === "dark" ? "#9aa0a8" : "#6b7280",
    border: theme === "dark" ? "#2a2e34" : "#e5e7eb",
    accent,
    accentBg: theme === "dark" ? `${accent}1a` : `${accent}15`,
    badgeText: theme === "dark" ? accent : accent,
    btnPrimary: accent,
    btnPrimaryHover: theme === "dark" ? `${accent}dd` : `${accent}cc`,
    btnPrimaryText: "#ffffff",
    spinner: accent,
    quoteBar: accent,
    shadow: theme === "dark" ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.08)",
  };
}

export default function ProductDetail() {
  const { props, isPending, openExternal } = useWidget<Props>();
  const colors = useColors(props?.store_theme?.accent_color);

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:0.5}50%{opacity:1}}@keyframes dots{0%{content:""}33%{content:"."}66%{content:".."}100%{content:"..."}}`}</style>
        <div
          style={{
            padding: "40px 24px",
            textAlign: "center",
            color: colors.textSecondary,
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            backgroundColor: colors.bg,
            borderRadius: 16,
            border: `1px solid ${colors.border}`,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              border: `3px solid ${colors.border}`,
              borderTop: `3px solid ${colors.spinner}`,
              borderRadius: "50%",
              margin: "0 auto 16px",
              animation: "spin 1s ease-in-out infinite",
            }}
          />
          <p
            style={{
              margin: "0 0 4px 0",
              fontSize: 14,
              fontWeight: 500,
              color: colors.text,
            }}
          >
            Analyzing this product for your skin
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              fontStyle: "italic",
              animation: "pulse 2s ease-in-out infinite",
            }}
          >
            Writing your personalized recommendation...
          </p>
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
        </div>
      </div>
    </McpUseProvider>
  );
}

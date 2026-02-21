import {
  McpUseProvider,
  useWidget,
  useWidgetTheme,
  type WidgetMetadata,
} from "mcp-use/react";
import { z } from "zod";

const propsSchema = z.object({
  description: z.string(),
});

export const widgetMetadata: WidgetMetadata = {
  description: "Displays a personalized skincare product description.",
  props: propsSchema,
  exposeAsTool: false,
};

type Props = z.infer<typeof propsSchema>;

export default function ProductDetail() {
  const { props, isPending } = useWidget<Props>();
  const theme = useWidgetTheme();

  const colors = {
    bg: theme === "dark" ? "#1a1a1a" : "#ffffff",
    text: theme === "dark" ? "#e8e4e0" : "#1c1917",
    textSecondary: theme === "dark" ? "#a8a29e" : "#78716c",
    border: theme === "dark" ? "#2a2a2a" : "#e7e5e4",
    accent: theme === "dark" ? "#c4956a" : "#b45309",
  };

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>
        <div
          style={{
            padding: 24,
            textAlign: "center",
            color: colors.textSecondary,
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              border: `2px solid ${colors.border}`,
              borderTop: `2px solid ${colors.accent}`,
              borderRadius: "50%",
              margin: "0 auto 12px",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <p style={{ margin: 0, fontSize: 13 }}>
            Creating your personalized recommendation...
          </p>
        </div>
      </McpUseProvider>
    );
  }

  return (
    <McpUseProvider autoSize>
      <div
        style={{
          padding: 20,
          backgroundColor: colors.bg,
          color: colors.text,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          borderRadius: 10,
          border: `1px solid ${colors.border}`,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 14,
            lineHeight: 1.7,
            whiteSpace: "pre-line",
          }}
        >
          {props.description}
        </p>
      </div>
    </McpUseProvider>
  );
}

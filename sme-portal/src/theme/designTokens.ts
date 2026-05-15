export const designTokens = {
  colors: {
    brand: {
      50: "#eff6ff",
      100: "#dbeafe",
      200: "#bfdbfe",
      300: "#93c5fd",
      400: "#60a5fa",
      500: "#2563eb",
      600: "#1d4ed8",
      700: "#1e40af",
      800: "#1e3a8a",
      900: "#172554",
    },
    success: {
      50: "#ecfdf5",
      100: "#d1fae5",
      500: "#059669",
      600: "#047857",
      700: "#065f46",
    },
    warning: {
      50: "#fff7ed",
      100: "#ffedd5",
      500: "#d97706",
      600: "#b45309",
      700: "#92400e",
    },
    danger: {
      50: "#fef2f2",
      100: "#fee2e2",
      500: "#dc2626",
      600: "#b91c1c",
      700: "#991b1b",
    },
    slate: {
      25: "#fcfcfd",
      50: "#f8fafc",
      100: "#f1f5f9",
      200: "#e2e8f0",
      300: "#cbd5e1",
      400: "#94a3b8",
      500: "#64748b",
      600: "#475569",
      700: "#334155",
      800: "#1e293b",
      900: "#0f172a",
    },
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    pill: 9999,
  },
  shadow: {
    card: "0 10px 30px rgba(15, 23, 42, 0.08)",
    hover: "0 18px 40px rgba(15, 23, 42, 0.12)",
    focus: "0 0 0 4px rgba(37, 99, 235, 0.18)",
  },
  gradient: {
    shell:
      "radial-gradient(circle at top left, rgba(37, 99, 235, 0.14), transparent 30%), linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
    login:
      "radial-gradient(circle at top, rgba(37, 99, 235, 0.24), transparent 32%), linear-gradient(135deg, #0f172a 0%, #172554 45%, #0f172a 100%)",
  },
} as const;

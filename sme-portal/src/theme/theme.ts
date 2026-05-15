import { alpha, createTheme, type ThemeOptions } from "@mui/material/styles";
import { designTokens } from "./designTokens";

const sharedThemeOptions: ThemeOptions = {
  shape: {
    borderRadius: designTokens.radius.md,
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 800, letterSpacing: -0.8 },
    h2: { fontWeight: 800, letterSpacing: -0.7 },
    h3: { fontWeight: 750, letterSpacing: -0.5 },
    h4: { fontWeight: 700, letterSpacing: -0.4 },
    h5: { fontWeight: 700, letterSpacing: -0.2 },
    h6: { fontWeight: 650 },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600, textTransform: "none" },
    body2: { color: designTokens.colors.slate[500] },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          height: "100%",
        },
        body: {
          minHeight: "100%",
          backgroundColor: designTokens.colors.slate[50],
          backgroundImage: designTokens.gradient.shell,
          color: designTokens.colors.slate[900],
        },
        "#root": {
          minHeight: "100vh",
        },
        "*::selection": {
          backgroundColor: alpha(designTokens.colors.brand[500], 0.18),
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          boxShadow: "none",
          borderBottom: `1px solid ${designTokens.colors.slate[200]}`,
          backdropFilter: "blur(14px)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: designTokens.radius.md,
          textTransform: "none",
          fontWeight: 700,
          paddingInline: 18,
          paddingBlock: 10,
        },
        contained: {
          boxShadow: designTokens.shadow.card,
          "&:hover": {
            boxShadow: designTokens.shadow.hover,
          },
        },
        outlined: {
          borderColor: designTokens.colors.slate[200],
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: designTokens.radius.lg,
          border: `1px solid ${designTokens.colors.slate[200]}`,
          boxShadow: designTokens.shadow.card,
          transition: "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
          "&:hover": {
            boxShadow: designTokens.shadow.hover,
            borderColor: designTokens.colors.slate[300],
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
        outlined: {
          borderColor: designTokens.colors.slate[200],
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: designTokens.radius.pill,
          fontWeight: 700,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: "outlined",
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: designTokens.radius.md,
          backgroundColor: designTokens.colors.slate[25],
          transition: "box-shadow 160ms ease, border-color 160ms ease",
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            boxShadow: designTokens.shadow.focus,
          },
        },
        notchedOutline: {
          borderColor: designTokens.colors.slate[200],
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: `1px solid ${designTokens.colors.slate[200]}`,
          backgroundImage: "none",
          backgroundColor: "rgba(255, 255, 255, 0.92)",
          backdropFilter: "blur(18px)",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 700,
          color: designTokens.colors.slate[700],
          backgroundColor: designTokens.colors.slate[50],
        },
      },
    },
  },
};

const lightPalette = {
  mode: "light" as const,
  primary: {
    main: designTokens.colors.brand[500],
    light: designTokens.colors.brand[400],
    dark: designTokens.colors.brand[700],
    contrastText: "#ffffff",
  },
  secondary: {
    main: designTokens.colors.success[500],
    light: designTokens.colors.success[100],
    dark: designTokens.colors.success[700],
    contrastText: "#ffffff",
  },
  warning: {
    main: designTokens.colors.warning[500],
    light: designTokens.colors.warning[100],
    dark: designTokens.colors.warning[700],
  },
  error: {
    main: designTokens.colors.danger[500],
    light: designTokens.colors.danger[100],
    dark: designTokens.colors.danger[700],
  },
  background: {
    default: designTokens.colors.slate[50],
    paper: "#ffffff",
  },
  text: {
    primary: designTokens.colors.slate[900],
    secondary: designTokens.colors.slate[500],
  },
  divider: designTokens.colors.slate[200],
};

const darkPalette = {
  mode: "dark" as const,
  primary: {
    main: designTokens.colors.brand[400],
    light: designTokens.colors.brand[300],
    dark: designTokens.colors.brand[600],
    contrastText: "#ffffff",
  },
  secondary: {
    main: designTokens.colors.success[500],
    light: designTokens.colors.success[100],
    dark: designTokens.colors.success[700],
    contrastText: "#ffffff",
  },
  warning: {
    main: designTokens.colors.warning[500],
    light: designTokens.colors.warning[100],
    dark: designTokens.colors.warning[700],
  },
  error: {
    main: designTokens.colors.danger[500],
    light: designTokens.colors.danger[100],
    dark: designTokens.colors.danger[700],
  },
  background: {
    default: designTokens.colors.slate[900],
    paper: designTokens.colors.slate[800],
  },
  text: {
    primary: designTokens.colors.slate[50],
    secondary: designTokens.colors.slate[400],
  },
  divider: alpha(designTokens.colors.slate[200], 0.14),
};

export const lightTheme = createTheme({
  ...sharedThemeOptions,
  palette: lightPalette,
});

export const darkTheme = createTheme({
  ...sharedThemeOptions,
  palette: darkPalette,
  components: {
    ...sharedThemeOptions.components,
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          height: "100%",
        },
        body: {
          minHeight: "100%",
          backgroundColor: designTokens.colors.slate[900],
          backgroundImage:
            "radial-gradient(circle at top left, rgba(37, 99, 235, 0.18), transparent 30%), linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
          color: designTokens.colors.slate[50],
        },
        "#root": {
          minHeight: "100vh",
        },
      },
    },
  },
});

export const theme = lightTheme;

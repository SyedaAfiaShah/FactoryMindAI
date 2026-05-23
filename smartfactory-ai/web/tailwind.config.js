/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      "colors": {
        "on-primary-fixed": "#0b1d2d",
        "secondary-container": "#ff7a2e",
        "tertiary-fixed": "#cee5ff",
        "outline-variant": "#c4c6cd",
        "on-secondary-container": "#612500",
        "on-secondary-fixed": "#351000",
        "secondary": "#a04100",
        "on-primary": "#ffffff",
        "surface-container-high": "#ebe8e3",
        "on-secondary": "#ffffff",
        "on-tertiary-container": "#5b96c9",
        "on-background": "#1c1c19",
        "inverse-surface": "#31302d",
        "surface-container-lowest": "#ffffff",
        "secondary-fixed": "#ffdbcc",
        "primary-fixed": "#d2e4fb",
        "surface-bright": "#fcf9f4",
        "background": "#fcf9f4",
        "tertiary-fixed-dim": "#96ccff",
        "surface-container": "#f0ede8",
        "surface-dim": "#dcdad5",
        "tertiary-container": "#002c48",
        "on-tertiary": "#ffffff",
        "surface-container-highest": "#e5e2dd",
        "tertiary": "#001729",
        "primary-container": "#1a2b3c",
        "surface-variant": "#e5e2dd",
        "on-secondary-fixed-variant": "#7a3000",
        "surface-container-low": "#f6f3ee",
        "outline": "#74777d",
        "error": "#ba1a1a",
        "primary": "#041627",
        "on-primary-fixed-variant": "#38485a",
        "secondary-fixed-dim": "#ffb693",
        "error-container": "#ffdad6",
        "surface-tint": "#4f6073",
        "surface": "#fcf9f4",
        "on-error": "#ffffff",
        "primary-fixed-dim": "#b7c8de",
        "inverse-on-surface": "#f3f0eb",
        "on-surface": "#1c1c19",
        "on-surface-variant": "#44474c",
        "on-primary-container": "#8192a7",
        "on-tertiary-fixed": "#001d32",
        "on-error-container": "#93000a",
        "inverse-primary": "#b7c8de",
        "on-tertiary-fixed-variant": "#004a75"
      },
      "borderRadius": {
        "DEFAULT": "0.125rem",
        "lg": "0.25rem",
        "xl": "0.5rem",
        "full": "0.75rem"
      },
      "spacing": {
        "panel-right-width": "320px",
        "stack-xs": "4px",
        "container-padding": "24px",
        "stack-sm": "8px",
        "rail-width": "64px",
        "stack-md": "16px",
        "gutter": "16px"
      },
      "fontFamily": {
        "display-lg": ["Inter", "sans-serif"],
        "data-header": ["JetBrains Mono", "monospace"],
        "label-caps": ["Inter", "sans-serif"],
        "data-tabular": ["JetBrains Mono", "monospace"],
        "headline-md": ["Inter", "sans-serif"],
        "body-md": ["Inter", "sans-serif"],
        "title-sm": ["Inter", "sans-serif"]
      },
      "fontSize": {
        "display-lg": ["32px", {"lineHeight": "40px", "letterSpacing": "-0.02em", "fontWeight": "600"}],
        "data-header": ["11px", {"lineHeight": "14px", "fontWeight": "500"}],
        "label-caps": ["11px", {"lineHeight": "16px", "letterSpacing": "0.05em", "fontWeight": "700"}],
        "data-tabular": ["13px", {"lineHeight": "18px", "fontWeight": "400"}],
        "headline-md": ["24px", {"lineHeight": "32px", "letterSpacing": "-0.01em", "fontWeight": "500"}],
        "body-md": ["14px", {"lineHeight": "20px", "fontWeight": "400"}],
        "title-sm": ["16px", {"lineHeight": "24px", "fontWeight": "600"}]
      }
    }
  },
  plugins: [],
}

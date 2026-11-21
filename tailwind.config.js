/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#F8FAF8',
        surface: '#FFFFFF',
        border: {
          DEFAULT: '#DADCE0',
        },
        text: {
          DEFAULT: '#202124',
          muted: '#5F6368',
        },
        primary: {
          DEFAULT: '#188038',
          hover: '#137333',
          soft: '#E6F4EA',
          softer: '#F1F8F3',
        },
        accent: {
          DEFAULT: '#F9AB00',
        },
        success: {
          DEFAULT: '#1E8E3E',
          soft: '#E6F4EA',
        },
        warning: {
          DEFAULT: '#F9AB00',
          soft: '#FEF7E0',
        },
        danger: {
          DEFAULT: '#D93025',
          soft: '#FCE8E6',
        },
        priority: {
          critical: '#D93025',
          high: '#E8710A',
          medium: '#F9AB00',
          low: '#1E8E3E',
        },
        status: {
          reported: '#5F6368',
          progress: '#E8710A',
          resolved: '#1E8E3E',
          pendingReview: '#188038',
          reopened: '#D93025',
        },
        civicSuccess: '#1E8E3E',
        civicWarning: '#F9AB00',
        civicDanger: '#D93025',
      },
      fontFamily: {
        sans: ["'Roboto'", "'Noto Sans Tamil'", 'system-ui', 'sans-serif'],
        heading: ["'Google Sans'", "'Product Sans'", "'Roboto'", "'Noto Sans Tamil'", 'system-ui', 'sans-serif'],
        tamil: ["'Noto Sans Tamil'", 'sans-serif'],
        mono: ["'Roboto Mono'", 'monospace'],
      },
      borderRadius: {
        card: '12px',
        control: '8px',
      },
      boxShadow: {
        soft: '0 1px 2px 0 rgba(60, 64, 67, 0.12)',
        card: '0 1px 3px rgba(60, 64, 67, 0.15), 0 1px 2px rgba(60, 64, 67, 0.08)',
        hover: '0 2px 6px 2px rgba(60, 64, 67, 0.15)',
        nav: '0 1px 3px 0 rgba(60, 64, 67, 0.08)',
      },
      transitionDuration: {
        DEFAULT: '150ms',
      }
    },
  },
  plugins: [],
};

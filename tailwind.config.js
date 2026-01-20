/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // 主色调
        sky: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          400: '#38bdf8',
          500: '#4A90E2',
          600: '#3b7bc9',
          700: '#2c5fa3',
        },
        mint: {
          300: '#6ee7b7',
          400: '#5FD4A0',
          500: '#4ec190',
          600: '#3da876',
        },
        sunset: {
          400: '#FFB84D',
          500: '#ffa933',
          600: '#e69520',
        },
        // 学科色彩
        math: {
          DEFAULT: '#3B82F6',
          light: '#DBEAFE',
        },
        chinese: {
          DEFAULT: '#FB7185',
          light: '#FECDD3',
        },
        english: {
          DEFAULT: '#A78BFA',
          light: '#E9D5FF',
        },
        science: {
          DEFAULT: '#10B981',
          light: '#D1FAE5',
        },
        // 背景色
        paper: '#F8F9FA',
      },
      fontFamily: {
        sans: ['"PingFang SC"', '"Microsoft YaHei"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 4px 16px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 8px 24px rgba(0, 0, 0, 0.12)',
        'modal': '0 12px 32px rgba(0, 0, 0, 0.15)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      backdropBlur: {
        xs: '2px',
      }
    }
  },
  plugins: [],
}

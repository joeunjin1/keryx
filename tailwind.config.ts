// [solution-architecture-foundation 스킬 준수]
// 모든 색상/크기/그림자는 이 파일의 디자인 토큰을 통해서만 사용
// 하드코딩 hex 색상 및 픽셀값 금지
import type { Config } from 'tailwindcss';

export default {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── KERYX 브랜드 팔레트 ──────────────────────────────────
        brand: {
          50:  '#EEEDFE',
          100: '#CECBF6',
          200: '#AFA9EC',
          300: '#9490E4',
          400: '#7F77DD',
          500: '#6366f1',
          600: '#534AB7',
          700: '#453D9F',
          800: '#3C3489',
          900: '#26215C',
        },
        // ── VIP 골드 ─────────────────────────────────────────
        vip: {
          50:  '#FAEEDA',
          100: '#F7DFB0',
          200: '#FAC775',
          300: '#F7B24A',
          400: '#EF9F27',
          500: '#d97706',
          600: '#BA7517',
          700: '#9A5E10',
          800: '#854F0B',
          900: '#412402',
        },
        // ── 상태 색상 ────────────────────────────────────────
        success: { 50: '#f0fdf4', 100: '#dcfce7', 500: '#22c55e', 600: '#16a34a', 700: '#15803d' },
        warning: { 50: '#fffbeb', 100: '#fef3c7', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706' },
        danger:  { 50: '#fef2f2', 100: '#fee2e2', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c' },
        info:    { 50: '#eff6ff', 100: '#dbeafe', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8' },
        // ── 역할별 포털 색상 ─────────────────────────────────
        portal: {
          admin:    '#6366f1',
          md:       '#6366f1',
          seller:   '#0ea5e9',
          factory:  '#10b981',
          designer: '#8b5cf6',
        },
        // ── 중립 ────────────────────────────────────────────
        neutral: {
          25:  '#FAFAFA',
          50:  '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        },
      },
      fontFamily: {
        sans: ['"Pretendard"', '"Noto Sans CJK KR"', '"Noto Sans SC"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      fontSize: {
        'xs':   ['0.75rem',  { lineHeight: '1rem' }],
        'sm':   ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem',     { lineHeight: '1.5rem' }],
        'lg':   ['1.125rem', { lineHeight: '1.75rem' }],
        'xl':   ['1.25rem',  { lineHeight: '1.75rem' }],
        '2xl':  ['1.5rem',   { lineHeight: '2rem' }],
        '3xl':  ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl':  ['2.25rem',  { lineHeight: '2.5rem' }],
        '5xl':  ['3rem',     { lineHeight: '1' }],
      },
      borderRadius: {
        'none': '0', 'sm': '0.25rem', 'DEFAULT': '0.375rem',
        'md': '0.5rem', 'lg': '0.75rem', 'xl': '1rem',
        '2xl': '1.25rem', '3xl': '1.5rem', 'full': '9999px',
      },
      boxShadow: {
        'xs':  '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'sm':  '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'md':  '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'lg':  '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'xl':  '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        'brand': '0 4px 14px 0 rgb(99 102 241 / 0.3)',
        'inner': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
        'none': 'none',
      },
      screens: {
        'xs':  '375px',
        'sm':  '640px',
        'md':  '768px',
        'lg':  '1024px',
        'xl':  '1280px',
        '2xl': '1536px',
      },
      minHeight: {
        'screen': '100dvh',
        'screen-safe': 'calc(100dvh - env(safe-area-inset-bottom))',
      },
      height: {
        'screen': '100dvh',
        'touch': '2.75rem',
      },
      zIndex: {
        'dropdown': '100', 'sticky': '200', 'fixed': '300',
        'modal-bg': '400', 'modal': '500', 'toast': '600', 'tooltip': '700',
      },
      keyframes: {
        'fade-in':    { '0%': { opacity: '0', transform: 'translateY(4px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'slide-up':   { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'shimmer':    { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      animation: {
        'fade-in':  'fade-in 0.2s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'shimmer':  'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;;

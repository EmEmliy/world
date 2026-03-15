import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#FF6B35', light: '#FF8F5E', dark: '#E55A2B' },
        bg: '#FFF8F0',
        text: '#4A3728',
        accent: '#A8D8B9',
        bubble: { npc: '#FFF3CD', user: '#FF6B35' },
      },
      fontFamily: {
        display: ['ZCOOL KuaiLe', 'cursive'],
        body: ['PingFang SC', 'Microsoft YaHei', 'sans-serif'],
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'pulse-dot': 'pulseDot 1.4s infinite ease-in-out both',
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'modal-in': 'modalIn 0.3s ease forwards',
        'modal-overlay': 'modalOverlay 0.3s ease forwards',
        'spriteWalk': 'spriteWalk 0.5s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulseDot: {
          '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: '0.5' },
          '40%': { transform: 'scale(1)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        modalIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        modalOverlay: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        spriteWalk: {
          '0%': { transform: 'translateY(0px)' },
          '100%': { transform: 'translateY(-4px)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;

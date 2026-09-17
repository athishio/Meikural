/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-root': '#050607',
        'bg-surface': '#0D0F11',
        'bg-surface-2': '#141719',
        'border-subtle': '#1E2225',
        'text-primary': '#F2F4F5',
        'text-secondary': '#9BA3A8',
        'text-muted': '#5E666B',
        'accent-green': '#22C55E',
        'accent-red': '#EF4444',
        'accent-amber': '#F59E0B',
        'accent-white': '#FFFFFF',
      },
      fontFamily: {
        sans: ['Inter', 'Google Sans Flex', 'General Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 10px 40px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.025)',
        'glow-green': '0 0 20px rgba(34,197,94,0.15)',
        'glow-red': '0 0 20px rgba(239,68,68,0.15)',
        'glow-amber': '0 0 20px rgba(245,158,11,0.15)',
      },
      borderRadius: {
        'card': '16px',
      }
    },
  },
  plugins: [],
}

// tailwind.config.js (updated)
module.exports = {
  darkMode: ["class"],
  content: [],
  theme: {
    extend: {
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      colors: {},
    },
  },
  plugins: [require("tailwindcss-animate")],
};

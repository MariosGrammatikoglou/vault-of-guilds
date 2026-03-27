// tailwind.config.js
export default {
  content: ["./src/index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      borderRadius: {
        board: "22px",
        pane: "18px",
        btn: "12px",
        input: "14px",
      },
      boxShadow: {
        glass: "0 10px 30px rgba(0,0,0,0.35), inset 0 1px rgba(255,255,255,0.05)",
      },
    },
  },
  plugins: [

  ],
};

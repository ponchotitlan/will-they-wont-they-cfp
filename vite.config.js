import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Expose the build arg passed in from Docker / CI as a Vite env variable.
  define: {
    "import.meta.env.VITE_ANTHROPIC_API_KEY": JSON.stringify(
      process.env.VITE_ANTHROPIC_API_KEY
    ),
  },
});

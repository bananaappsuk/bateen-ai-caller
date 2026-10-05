import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // Page tests mount a whole screen and wait on several mocked fetches. The
    // 5s default is enough in isolation but not always when the files run in
    // parallel, which showed up as a one-off timeout rather than a real
    // failure -- the worst kind of test result to have to interpret.
    testTimeout: 20_000,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});

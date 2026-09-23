import { configDefaults, defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // requieren Docker + Supabase local: se corren con `npm run test:rls`
    exclude: [...configDefaults.exclude, "src/lib/rls-integration/**"],
  },
});

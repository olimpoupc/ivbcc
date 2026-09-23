import { defineConfig } from "vitest/config";
import path from "node:path";

// Pruebas de integracion RLS: requieren Docker + `npx supabase start` con las
// migraciones aplicadas. Se ejecutan con `npm run test:rls`; `npm test` las
// excluye (ver vitest.config.mts) para no depender de Docker.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/lib/rls-integration/**/*.test.ts"],
  },
});

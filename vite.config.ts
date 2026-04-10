import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function resolveBasePath() {
  const explicitBase = process.env.VITE_BASE_PATH?.trim();

  if (explicitBase) {
    return explicitBase.endsWith("/") ? explicitBase : `${explicitBase}/`;
  }

  const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1]?.trim();

  if (!repositoryName || repositoryName.toLowerCase().endsWith(".github.io")) {
    return "/";
  }

  return `/${repositoryName}/`;
}

export default defineConfig({
  plugins: [react()],
  base: resolveBasePath(),
});

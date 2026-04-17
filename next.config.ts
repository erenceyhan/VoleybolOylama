import path from "path";
import { fileURLToPath } from "url";
import type { NextConfig } from "next";

const configDirectory = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  turbopack: {
    root: configDirectory,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

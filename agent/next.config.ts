import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Native or Node-only packages stay out of the bundle.
  serverExternalPackages: ["better-sqlite3", "pino", "nodemailer", "imapflow", "cheerio"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

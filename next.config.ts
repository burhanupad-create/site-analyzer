import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium-min", "xml2js", "cheerio"],
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;

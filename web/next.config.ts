import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import path from "node:path";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // Pin the Turbopack workspace root to this Next app — we sit inside a
  // polyrepo with a Python-managed parent, which would otherwise cause
  // Turbopack to walk up and pick the wrong root.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default withNextIntl(nextConfig);

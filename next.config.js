/** @type {import('next').NextConfig} */
const distDir = process.env.NEXT_DIST_DIR || ".next";
const nextConfig = {
  distDir,
};

module.exports = nextConfig

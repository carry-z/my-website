/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["ali-oss"],
  async rewrites() {
    return [{ source: "/lab", destination: "/lab-assets/index.html" }];
  },
};

export default nextConfig;

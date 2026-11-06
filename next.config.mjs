/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [{ source: "/lab", destination: "/lab-assets/index.html" }];
  },
};

export default nextConfig;

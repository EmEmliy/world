/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 's3plus-bj02.vip.sankuai.com' },
      { protocol: 'http', hostname: 'p0.meituan.net' },
      { protocol: 'http', hostname: 'p1.meituan.net' },
    ],
  },
};

export default nextConfig;

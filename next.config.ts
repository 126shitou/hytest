import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const nextConfig: NextConfig = {

  assetPrefix:
    process.env.NODE_ENV === "production"
      ? process.env.NEXT_PUBLIC_CLOUDFLARE_CDN_URL + "/prod" : "",

  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "embla-carousel-react",
      "@radix-ui/react-select",
      "@radix-ui/react-dialog",
      "react-i18next",
      "i18next",
      "clsx",
      "tailwind-merge"
    ],
    optimizeCss: true,
  },

  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },

  compress: true,

  trailingSlash: false,

  /* config options here */
  images: {
    // unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "r2.geminiimagegenerator.online",
        port: "",
        pathname: "/**",
      }
    ],
  },

  webpack(config, { buildId, dev, isServer, defaultLoaders, webpack }) {

    const fileLoaderRule = config.module.rules.find((rule: any) =>
      rule.test?.test?.('.svg'),
    )
    config.module.rules.push(
      // Reapply the existing rule, but only for svg imports ending in ?url
      {
        ...fileLoaderRule,
        test: /\.svg$/i,
        resourceQuery: /url/, // *.svg?url
      },
      // Convert all other *.svg imports to React components
      {
        test: /\.svg$/i,
        issuer: fileLoaderRule.issuer,
        resourceQuery: { not: [...fileLoaderRule.resourceQuery.not, /url/] }, // exclude if *.svg?url
        use: ['@svgr/webpack'],
      },
    )

    if (!isServer && !dev) {
      // 使用标准的 Next.js 路径结构，只修改文件名
      config.output.filename = "static/chunks/[contenthash].js";
      config.output.chunkFilename = "static/chunks/[contenthash].js";

      // 优化但不破坏结构
      config.output.pathinfo = false;
      config.optimization.moduleIds = "deterministic";
      config.optimization.chunkIds = "deterministic";

      // 代码分割优化
      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 20000,  // 最小20KB才分割
        minChunks: 1,
        maxAsyncRequests: 12,
        maxInitialRequests: 4,
        enforceSizeThreshold: 50000,  // 50KB以上强制分割
        cacheGroups: {
          default: false,
          vendors: false,
          // 框架代码单独打包
          framework: {
            chunks: 'all',
            name: 'framework',
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription|next|@next)[\\/]/,
            priority: 40,
            enforce: true,
            minSize: 0,  // 忽略大小限制，强制分割
          },


          // i18n 语言包动态分组
          i18n: {
            chunks: 'all',
            test: /[\\/]i18n[\\/]locales[\\/]([^\/\\]+)[\\/].*\.json$/,
            name(module: any) {
              const match = module.resource.match(/[\\/]i18n[\\/]locales[\\/]([^\/\\]+)[\\/]/);
              return match ? `i18n-${match[1]}` : 'i18n-unknown';
            },
            priority: 33,
            enforce: true,
          },

          // 大文件单独处理(大于 20KB)
          largeLibs: {
            test: /[\\/]node_modules[\\/]/,
            name(module: any) {
              // 获取包名
              const packageName = module.context.match(
                /[\\/]node_modules[\\/](.*?)([\\/]|$)/
              )?.[1]
              return `vendor-${packageName?.replace('@', '')}`
            },
            priority: 30,
            minSize: 20000, // 只有大于 20KB 的才单独分包
            reuseExistingChunk: true,
          },

          smallChunks: {
            test: /[\\/]node_modules[\\/]/,
            name: 'small-chunks', // 统一打包到这个文件
            priority: 20,
            maxSize: 20000, // 小于等于 20KB 的文件
            minSize: 0, // 允许任何大小
            enforce: true, // 强制执行
            reuseExistingChunk: true,
          },

        },
      };
    }
    return config;
  },
  productionBrowserSourceMaps: false,

};

const bundleAnalyzerConfig = withBundleAnalyzer({
  enabled: false,
})

export default bundleAnalyzerConfig(nextConfig);

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev()
}
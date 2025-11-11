import type { MetadataRoute } from "next";
/**
* Robots.txt 配置
* 用于指导搜索引擎爬虫如何抓取网站内容
* 提升SEO效果，保护敏感路径
*/
export default function robots(): MetadataRoute.Robots {
  // 根据环境设置基础URL
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
  return {
    rules: [
      {
        userAgent: "*",
        disallow: ["/api", "/.well-known",],
        allow: "/",
      },
    ],
    // 指向sitemap的URL
    sitemap: `${baseUrl}/sitemap.xml`,
    // 网站主机信息（可选）
    host: baseUrl,
  };
}

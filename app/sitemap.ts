// 单个 sitemap 最多 50,000 个 URL
// 内容变化时更新 sitemap

/**
 * @loc: 页面的完整 URL（必需）
 * @lastmod: 页面最后修改时间（可选）
 * @alternates: 多语言版本的链接关系（用于SEO优化）
 */

/**
 * 帮助搜索引擎发现页面：特别是那些难以通过链接发现的页面
 * 提供页面元信息：如最后修改时间、更新频率、优先级等
 * 加速索引：帮助搜索引擎更快地发现和索引新内容
 * 提高 SEO 效果：确保重要页面被搜索引擎收录
 * xhtml:link 提供多语言版本的链接关系
 */

import { languages, defaultLng } from "@/i18n/setting";
import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;

  const sitemaps: MetadataRoute.Sitemap = [];

  const urls = [
    {
      url: "/", // 首页
      lastModified: new Date("2025-11-06 12:03:42"),
      changeFrequency: "daily" as const,
      priority: 1,
    },
  ];


  urls.forEach((urlConfig) => {
    sitemaps.push({
      url: `${baseUrl}${urlConfig.url === "/" ? "" : urlConfig.url}`,
      lastModified: urlConfig.lastModified,
      changeFrequency: urlConfig.changeFrequency,
      priority: urlConfig.priority,
    });
  });

  // 为每种语言创建单独的URL条目（排除默认语言，因为默认语言会重定向到根路径）
  languages
    .filter((lang) => lang !== defaultLng) // 排除默认语言
    .forEach((lang) => {
      urls.forEach((urlConfig) => {
        const url = urlConfig.url === "/" ? "" : urlConfig.url;
        sitemaps.push({
          url: `${baseUrl}/${lang}${url}`,
          lastModified: urlConfig.lastModified,
          changeFrequency: urlConfig.changeFrequency,
          priority: urlConfig.priority,
        });
      });
    });

  return sitemaps;
}

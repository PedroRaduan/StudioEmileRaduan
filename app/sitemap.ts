import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap { return ["", "/termos", "/privacidade"].map((path) => ({ url: path || "/", lastModified: new Date(), changeFrequency: "monthly", priority: path ? 0.5 : 1 })); }

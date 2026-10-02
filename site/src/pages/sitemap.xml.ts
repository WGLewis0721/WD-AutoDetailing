import type { APIRoute } from 'astro';

/* Hand-rolled because the site lives on a sub-path: @astrojs/sitemap resolved pages against the host root and dropped the path. */
const PAGES = ['', 'book/'];

export const GET: APIRoute = ({ site }) => {
  const root = (site?.href ?? '').replace(/\/?$/, '/');
  const lastmod = new Date().toISOString().slice(0, 10);
  const urls = PAGES.map((p) => `<url><loc>${root}${p}</loc><lastmod>${lastmod}</lastmod></url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>\n`, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};

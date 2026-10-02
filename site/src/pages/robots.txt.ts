import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const root = (site?.href ?? '').replace(/\/?$/, '/');
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${root}sitemap.xml\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};

import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

// Hybrid output: static home page + serverless API routes on Vercel.
export default defineConfig({
  output: 'server',
  adapter: vercel(),
});

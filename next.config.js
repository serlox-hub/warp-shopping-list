/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Enable static optimization for better performance
    optimizePackageImports: ['@supabase/supabase-js'],
  },
  
  // Configure for potential static export
  trailingSlash: true,
  
  // Image optimization settings
  images: {
    unoptimized: true,
  },
  reactStrictMode: false,
  
  // Environment variables with fallbacks
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-key-for-build',
  },
}

module.exports = nextConfig

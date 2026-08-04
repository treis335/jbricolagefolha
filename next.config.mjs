import withPWAInit from '@ducanh2912/next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  // Force clients to use new SW immediately
  clientsClaim: true,
  workboxOptions: {
    // Bump this string to force ALL users to get fresh cache
    cacheId: 'jbricolage-v3',
    skipWaiting: true,
    clientsClaim: true,
    // Clean old caches on activate
    cleanupOutdatedCaches: true,
    runtimeCaching: [
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|webp|ico|gif)$/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'jbricolage-images-v3',
          expiration: { maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 },
          networkTimeoutSeconds: 5,
        },
      },
      {
        urlPattern: /\.(?:js|css)$/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'jbricolage-static-v3',
          networkTimeoutSeconds: 5,
        },
      },
    ],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // eslint key foi removido — já não é suportado no Next 16
  // usar em vez disso: next lint --ignore-path ou .eslintignore
  images: {
    unoptimized: true,
  },
  // Silencia o erro de webpack/turbopack — sem webpack config customizada
  turbopack: {},
};

export default withPWA(nextConfig);

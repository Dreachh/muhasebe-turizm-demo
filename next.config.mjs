import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let userConfig = undefined
try {
  // try to import ESM first
  userConfig = await import('./v0-user-next.config.mjs')
} catch (e) {
  try {
    // fallback to CJS import
    userConfig = await import("./v0-user-next.config");
  } catch (innerError) {
    // ignore error
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Firebase istemci taraflı kullanımını desteklemek için Webpack yapılandırması
  webpack: (config, { isServer }) => {
    // İstemci tarafı derlemelerinde bu modülleri çalışmasına izin ver
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    // TypeScript paths aliaslarını desteklemek için ayar
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@": path.resolve(__dirname),
    };

    // Next.js 15.2.4 için client-only kullanımını kaldırdık
    // Firebase modülleri serverExternalPackages ile zaten işaretleniyor
    
    return config;
  },
  // Next.js 15 ile transpilePackages kullanımını tamamen kaldırıyoruz
  // Bunun yerine serverExternalPackages kullanacağız
  // Next.js 15.2.4 için güncellenmiş deneysel özellikler
  experimental: {
    webpackBuildWorker: true,
    parallelServerBuildTraces: true,
    parallelServerCompiles: true,
  },
  // Server tarafında harici tutulacak paketler (serverComponentsExternalPackages yerine)
  serverExternalPackages: [
    'firebase', 
    '@firebase/app',
    '@firebase/app-compat',
    '@firebase/auth',
    '@firebase/auth-compat',
    '@firebase/database',
    '@firebase/database-compat',
    '@firebase/firestore',
    '@firebase/firestore-compat',
    '@firebase/functions',
    '@firebase/functions-compat',
    '@firebase/storage',
    '@firebase/storage-compat'
  ],
  
  // Next.js 15.2.4 ile optimizeFonts artık desteklenmez
  // optimizeFonts: false,
}

if (userConfig) {
  // ESM imports will have a "default" property
  const config = userConfig.default || userConfig

  for (const key in config) {
    if (
      typeof nextConfig[key] === 'object' &&
      !Array.isArray(nextConfig[key])
    ) {
      nextConfig[key] = {
        ...nextConfig[key],
        ...config[key],
      }
    } else {
      nextConfig[key] = config[key]
    }
  }
}

export default nextConfig

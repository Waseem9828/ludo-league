
/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverActions: {
            bodySizeLimit: '4mb',
        },
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'firebasestorage.googleapis.com',
            },
            {
                protocol: 'https',
                hostname: 'picsum.photos',
            },
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
            },
            {
                protocol: 'https',
                hostname: 'api.dicebear.com',
            },
            {
                protocol: 'https',
                hostname: 'api.qrserver.com',
            },
        ],
    },
    async headers() {
        return [
            {
                // Apply these headers to all routes in your application.
                source: '/(.*)',
                headers: [
                    {
                        key: 'Cross-Origin-Opener-Policy',
                        value: 'same-origin-allow-popups', // Changed from 'same-origin'
                    },
                    {
                        key: 'Cross-Origin-Embedder-Policy',
                        value: 'credentialless', // Changed from 'require-corp'
                    },
                ],
            },
        ]
    },
};

module.exports = nextConfig;

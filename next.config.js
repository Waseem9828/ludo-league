/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        allowedDevOrigins: ["https://6000-firebase-studio-1762409723230.cluster-52r6vzs3ujeoctkkxpjif3x34a.cloudworkstations.dev"],
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
};

module.exports = nextConfig;

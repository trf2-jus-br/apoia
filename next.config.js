/** @type {import('next').NextConfig} */

// const webpack = require('webpack');

const nextConfig = {
    // trailingSlash: true,
    output: "standalone",
    serverExternalPackages: ['knex', 'pdf-parse'],
    turbopack: {
        rules: {
            '*.md': {
                loaders: ['raw-loader'],
                as: '*.js',
            },
            '*.txt': {
                loaders: ['raw-loader'],
                as: '*.js',
            },
            '*.html': {
                loaders: ['raw-loader'],
                as: '*.js',
            },
        },
    },
    webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
        config.module.rules.push({
            test: /\.(txt|md|html)$/,
            // This is the asset module.
            type: 'asset/source',
        })
        if (isServer) {
            config.externals = [
                ...config.externals,
                {
                    // Possible drivers for knex - we'll ignore them
                    // comment the one YOU WANT to use
                    sqlite3: 'sqlite3',
                    'better-sqlite3': 'better-sqlite3',
                    // mysql2: 'mysql2', // << using this one
                    mariasql: 'mariasql',
                    mysql: 'mysql',
                    mssql: 'mssql',
                    oracle: 'oracle',
                    'strong-oracle': 'strong-oracle',
                    oracledb: 'oracledb',
                    // pg: 'pg',
                    'pg-query-stream': 'pg-query-stream',
                    "pdfjs-dist/build/pdf.worker.min.js": "pdfjs-dist/build/pdf.worker.min.js"
                }
            ]
        }
        // Suppress known dynamic require warnings from third-party libs.
        config.ignoreWarnings = [
            ...(config.ignoreWarnings || []),
            {
                module: /nunjucks[\\/]src[\\/]node-loaders\.js/,
                message: /Critical dependency: the request of a dependency is an expression/
            },
            {
                module: /swagger-jsdoc[\\/]src[\\/]utils\.js/,
                message: /Critical dependency: the request of a dependency is an expression/
            }
        ]
        return config
    },
    // experimental: {
    //     staleTimes: {
    //         dynamic: 0,
    //         static: 180,
    //     },
    // },
}

module.exports = nextConfig

// Injected content via Sentry wizard below

const { withSentryConfig } = require("@sentry/nextjs");

module.exports = withSentryConfig(
    module.exports, {
        // For all available options, see:
        // https://www.npmjs.com/package/@sentry/webpack-plugin#options

        org: "trf2",
        project: "javascript-nextjs",

        // Only print logs for uploading source maps in CI
        silent: !process.env.CI,

        // For all available options, see:
        // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

        // Upload a larger set of source maps for prettier stack traces (increases build time)
        widenClientFileUpload: false, // true,

        // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
        // This can increase your server load as well as your hosting bill.
        // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
        // side errors will fail.
        // tunnelRoute: "/monitoring",

        // Automatically tree-shake Sentry logger statements to reduce bundle size
        disableLogger: true,

        // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
        // See the following for more information:
        // https://docs.sentry.io/product/crons/
        // https://vercel.com/docs/cron-jobs
        automaticVercelMonitors: false, // true,
    }
);
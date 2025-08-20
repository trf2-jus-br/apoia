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
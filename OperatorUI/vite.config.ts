// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import react from '@vitejs/plugin-react';
import * as path from 'path';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    nodePolyfills({
      globals: {
        process: false,
        Buffer: false,
      },
    }),
    react({
      babel: {
        plugins: [
          'babel-plugin-transform-typescript-metadata',
          ['@babel/plugin-proposal-decorators', { legacy: true }],
          '@babel/plugin-transform-class-properties',
          '@babel/plugin-proposal-explicit-resource-management',
        ],
      },
    }),
    // Bundle analyzer - generates bundle-analysis.html after build
    visualizer({
      filename: 'bundle-analysis.html',
      open: false, // Set to true to auto-open after build
      gzipSize: true,
      brotliSize: true,
      template: 'treemap', // 'sunburst', 'treemap', 'network'
    }),
  ],
  server: {
    port: 5173,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@dtos': path.resolve(__dirname, 'src/dtos'),
      '@util': path.resolve(__dirname, 'src/util'),
      '@enums': path.resolve(__dirname, 'src/model/enums'),
      '@interfaces': path.resolve(__dirname, 'src/model/interfaces'),
      '@OCPP2_0_1': path.resolve(__dirname, 'src/util/ocpp2_0_1_dependencies'),
      '@OCPP1_6': path.resolve(__dirname, 'src/util/ocpp1_6_dependencies'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],

          // Refine framework dependencies
          'vendor-refine': [
            '@refinedev/core',
            '@refinedev/antd',
            '@refinedev/hasura',
            '@refinedev/kbar',
            '@refinedev/react-router-v6',
          ],

          // Ant Design UI library
          'vendor-antd': ['antd', '@ant-design/icons'],

          // Charts library
          'vendor-charts': ['recharts'],

          // Maps libraries
          'vendor-maps': [
            '@vis.gl/react-google-maps',
            '@googlemaps/markerclusterer',
          ],

          // GraphQL dependencies
          'vendor-graphql': ['graphql', 'graphql-request', 'graphql-tag'],

          // Utility libraries
          'vendor-utils': [
            'dayjs',
            'moment',
            'lodash.debounce',
            'lodash.isequal',
            'lodash.merge',
          ],

          // Authentication
          'vendor-auth': ['keycloak-js'],

          // CitrineOS base module
          citrineos: ['@citrineos/base'],
        },
      },
    },
    // Increase chunk size warning limit (we know about large vendor chunks)
    chunkSizeWarningLimit: 1000,
    // Enable source maps for production debugging
    sourcemap: true,
  },
});

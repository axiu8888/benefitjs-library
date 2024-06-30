/*
 * @Description:
 * @LastEditTime: 2023-03-15 16:26:00
 */
import { defineConfig } from "vite";
// import vue from "@vitejs/plugin-vue";
import nodePolyfills from 'rollup-plugin-polyfill-node';

export default defineConfig({
  build: {
    lib: {
      entry: "./src/index.ts",
      name: "node", //导出的类名称
      fileName: "node",
    },
    minify: 'terser', // 禁用压缩
    terserOptions: {
      compress: false, // 禁用压缩
      mangle: false, // 禁用混淆
      format: {
        beautify: true // 美化输出
      }
    },
    rollupOptions: {
      external: ['fs', 'sqlite3', 'serialport'],
      output: {
        globals: {
          fs: 'fs',
          sqlite3: 'sqlite3',
          serialport: 'serialport',
        }
      }
    },
  },
  define: { "process.env": {} },
  plugins: [
    // vue(),
    nodePolyfills( /* options */ )
  ], 
  resolve: {
    alias: {
      "@": "./src",
    },
  },
});

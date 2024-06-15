/*
 * @Description:
 * @LastEditTime: 2023-03-15 16:26:00
 */
import { defineConfig } from "vite";

// import vue from "@vitejs/plugin-vue";

export default defineConfig({
  build: {
    lib: {
      entry: "./src/index.ts",
      name: "core", //导出的类名称
      fileName: "core",
    },
    minify: 'terser', // 禁用压缩
    terserOptions: {
      compress: false, // 禁用压缩
      mangle: false, // 禁用混淆
      format: {
        beautify: true // 美化输出
      }
    },
  },
  define: { "process.env": {} },
  // plugins: [vue()],
  resolve: {
    alias: {
      "@": "./src",
    },
  },
});

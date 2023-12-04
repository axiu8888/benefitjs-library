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
      name: "widgets", //导出的类名称
      fileName: "widgets",
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

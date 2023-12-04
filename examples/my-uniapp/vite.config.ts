
import { defineConfig } from "vite"
import DefineOptions from "unplugin-vue-define-options/vite"
import uni from "@dcloudio/vite-plugin-uni"
const path = require("path")
// https://vitejs.dev/config/
export default defineConfig(({ command, mode, ssrBuild }) => {
  return {
    plugins: [uni(), DefineOptions()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    transpileDependencies: ["uview-plus"],
  }
})


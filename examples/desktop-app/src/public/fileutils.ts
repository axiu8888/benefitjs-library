import { logger } from "@benefitjs/core";

/**
 * 文件工具
 */
export namespace FileUtils {
    /**
     * 日志
     */
    export const log = logger.newProxy("file-utils");

    // 递归获取文件夹中的文件
    export const getFilesFromDataTransfer =  async (items) => {
        log.info('items:', items)
    
        const files = []
        
        for (const item of items) {
          if (item.kind === 'file') {
            const entry = item.webkitGetAsEntry()
            if (entry.isDirectory) {
              const dirFiles = await readDirectory(entry)
              files.push(...dirFiles)
            } else {
              files.push(item.getAsFile())
            }
          }
        }
        
        return files
      }


    // 读取目录内容
    const readDirectory = async (directoryEntry) => {
        const files = []
        const reader = directoryEntry.createReader()
        const readEntries = async () => {
            const entries = await new Promise((resolve) => reader.readEntries(resolve))
            for (const entry of entries) {
                if (entry.isDirectory) {
                    files.push(...await readDirectory(entry))
                } else {
                    files.push(await getFileFromEntry(entry))
                }
            }
        }
        await readEntries()
        return files
    }

}


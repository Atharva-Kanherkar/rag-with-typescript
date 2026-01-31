 import { readdir, readFile } from "fs/promises"
import path from "path"

interface RawDocument {
  path: string
  content: string
}

async function loadDocuments(rootDir: string): Promise<RawDocument[]> {
   
  const entries = await readdir(rootDir, {
    recursive: true,
    withFileTypes: true,
  })

 
  const promises: Promise<RawDocument>[] = []

  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith(".md")) {
      const fullPath = path.join(rootDir, entry.name)

      const promise = readFile(fullPath, "utf-8").then((content) => ({
        path: fullPath,
        content,
      }))

      promises.push(promise)
    }
  }

 
  return Promise.all(promises)
}

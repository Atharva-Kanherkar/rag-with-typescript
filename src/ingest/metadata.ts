import { RawDocument } from "./loader.js"
import matter from 'gray-matter';
import path from "path";

 export interface DocumentMetadata {
  title: string              // From frontmatter or first H1
  sourcePath: string         // Original file path
  sectionPath: string[]      // ["concepts", "workloads", "pods"] from folder structure
  headers: Header[]          // All headers with their levels
}

export interface Header {
  level: number    // 1, 2, 3...
  text: string     // "Pod Lifecycle"
  position: number // Character index where it starts
}

export interface ParsedDocument{
    path : string
    content : string
    metadata : DocumentMetadata
}

export function parseDocument(raw : RawDocument) : ParsedDocument{
    // 1. Parse frontmatter - separate variables for clarity
    const rawContent = raw.content;
    const parsed = matter(rawContent);
    const contentWithoutFrontmatter = parsed.content;
    let title = parsed.data.title;
    const sourcePath = raw.path;
    
    // 2. Extract section path from folder structure
    const normalized = path.posix.normalize(sourcePath);
    const parts = normalized.split("/");
    const docsIndex = parts.indexOf("docs");
    
    // for(let i = 0; i<parts.length; i++){
    //     if( i <= docsIndex){
    //       continue;
    //     }
    //     else{
    //       sectionPath.push(parts[i])
    //     }
    // } //this implementation has several edge cases. 
    //1. what if "docs" is not found in the path, indexof returns -1/ 
    //2. we are including filename in the section path. 
    
    // simpler implementation : 
    if (docsIndex === -1) {
        throw new Error(`"docs" not found in path: ${sourcePath}`);
    }
    
    const sectionPath = parts.slice(docsIndex + 1); //everything after "docs"
    sectionPath.pop(); //remove the filename (last element popped)
    
    // 3. Find all headers using regex
    const headers: Header[] = [];
    const headerRegex = /^(#{1,6})\s+(.+)$/gm;
    const matches = [...contentWithoutFrontmatter.matchAll(headerRegex)]; // use parsed content here!
    
    for (const match of matches) {
        headers.push({
            level: match[1].length,
            text: match[2],
            position: match.index ?? 0
        });
    }
    
    // 4. Title fallback: if no frontmatter title, use first H1
    if (!title && headers.length > 0) {
        const h1 = headers.find(h => h.level === 1);
        if (h1) {
            title = h1.text;
        }
    }
    
    if (!title) {
        title = "Untitled";
    }
    
    // 5. Return parsed document
    return {
        path: sourcePath,
        content: contentWithoutFrontmatter,  // return content WITHOUT frontmatter
        metadata: {
            title: title,
            sourcePath: sourcePath,
            sectionPath: sectionPath,
            headers: headers,
        }
    };
}

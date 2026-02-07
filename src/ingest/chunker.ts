//implement chunker.ts 
// this is the last basic in ingest
//loader-->metadata-->chunker-->output
//  The chunker takes a ParsedDocument and breaks it into smaller pieces.
//input comes from metadata.ts 

import path from "path";
import { Header, ParsedDocument } from "./metadata.js";

 
interface ParentChunk{
    id : string;
    content: string;
    startPosition : number;
      endPosition : number;
    header : Header;
}
interface ChildChunk {
    id : string;
    parent_id : string;
    content : string;

}
interface Chunk{
    id : string;
    content : string;
    parent_id : string | null;
    source_file : string;
    section_path : string[];
    chunk_type : "parent" | "child";
    strategy : "recursive";
}
//parent chunk is basically our h2 header. 
//we will use the headers array to basically find where each h2 section starts. simple.

function splitIntoParents(doc : ParsedDocument) : ParentChunk[]{
const h2Headers = doc.metadata.headers.filter(h => h.level === 2);
const parents : ParentChunk[] = [];
for(let i = 0; i<h2Headers.length; i++){
    const header = h2Headers[i];
    const nextHeader = h2Headers[i+1];
    const startPosition = header.position;
    const endPosition = nextHeader ? nextHeader.position : doc.content.length;
    const content = doc.content.slice(startPosition, endPosition);
    const id = generateId(doc.path, i);
    parents.push({
      id : id, 
      content : content,
      startPosition : startPosition,
      endPosition : endPosition, 
      header : header
    });
 

}
   return parents;
}

   function generateId(filePath: string, index: number): string {
    // Convert "/docs/concepts/pods.md" → "concepts-pods"
    const normalized = path.basename(filePath, '.md');  // removes .md extension
    return `${normalized}-p${index}`;  // "pod-lifecycle-p0", "pod-lifecycle-p1"
  }


  function splitParentIntoChildren(parent : ParentChunk) : ChildChunk[]{
     //  We don't want "## Pod phase" in every child chunk - it's redundant.
    // so we will use regex to remove it.
       const body = parent.content.replace(/^## .+\n?/, '');
      //split by setences now. 
      //again, regex. sentences end with ., ! or ? so we can use it. 
        const sentences = body.match(/[^.!?]+[.!?]+/g) || [];

// now, basically, we will group by sentences. so lets do that. 
       const children : ChildChunk[] = [];
       let currentGroup = '';
       let childIndex = 0;
       for (const sentence of sentences){
          if(currentGroup.length + sentence.length <= 200){
              currentGroup+= sentence
          }
          else{
              if(currentGroup){
                children.push({
                      id: `${parent.id}-c${childIndex}`,
                      content : currentGroup.trim(),
                      parent_id : parent.id
                })
                childIndex++;
              }
              currentGroup = sentence;
          }

       }
        
     if (currentGroup) {
          children.push({
              id: `${parent.id}-c${childIndex}`,
              content: currentGroup.trim(),
              parent_id: parent.id
          });
      }
      return children;
  }


  function chunkDocument( doc : ParsedDocument, strategy : "recursive") : Chunk[] {
     const chunks : Chunk[] = [];
      const parents = splitIntoParents(doc);
      for(const parent of parents){
               chunks.push({
        id: parent.id,
        content: parent.content,
        parent_id: null,  // parents have no parent
        source_file: doc.path,
        section_path: doc.metadata.sectionPath,
        chunk_type: "parent",
        strategy: strategy
      });

      const children = splitParentIntoChildren(parent);
           for (const child of children) {
        chunks.push({
          id: child.id,
          content: child.content,
          parent_id: child.parent_id,  // references parent
          source_file: doc.path,
          section_path: doc.metadata.sectionPath,
          chunk_type: "child",
          strategy: strategy
        });
      }
      }
      return chunks; 
  }
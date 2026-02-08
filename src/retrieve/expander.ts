import { Chunk } from "../ingest/chunker.js";
  import { getParents } from "../index/parentstore.js";

interface SearchResult{
    childId : number, 
    parentId : number,
    content : string,
    score : number, 
}


  export async function expandToParents(
    searchResults: SearchResult[]
  ): Promise<Chunk[]> {

   const parentIds = searchResults.map(r=>r.parentId);
 
   const parents = await getParents(parentIds);
   return parents;
     








  }
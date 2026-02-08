
  // What it does:
  // 1. Embed the query
  // 2. Call vectordb.searchChunks()
  // 3. Return results

import { embed } from "../index/embedder.js";
import { searchChunks } from "../index/vectordb.js";

  export async function search(
    query: string,
    topK: number = 10
  ): Promise<Array<{
    childId: number;
    score: number;
    content: string;
    parentId: number;
  }>> {
     
     const results = await searchChunks(query, embed, topK);
     return results.map(r => ({
      childId: r.id,
      score: r.score,
      content: r.payload.content,
      parentId: r.payload.parent_id,
    }));

  }
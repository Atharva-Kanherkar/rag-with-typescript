import { QdrantClient } from '@qdrant/js-client-rest';
import { Chunk } from '../ingest/chunker.js';

const client = new QdrantClient({
  url: 'http://localhost:6333',
});

export async function initVectorDB(): Promise<void> {
  try {
    await client.createCollection('documind_chunks', {
      vectors: {
        size: 384,
        distance: 'Cosine'
      }
    });
    console.log('Collection created');
  } catch (e: any) {
    if (e.status === 409) {
      console.log('Collection already exists');
    } else {
      throw e;
    }
  }
}

export async function indexChunks(
  chunks: Chunk[],
  embedFn: (texts: string[]) => Promise<number[][]>
): Promise<void> {

  const BATCH_SIZE = 50; // Process 50 chunks at a time to avoid timeout
  
  for (let batchStart = 0; batchStart < chunks.length; batchStart += BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE, chunks.length);
    const batchChunks = chunks.slice(batchStart, batchEnd);
    
    console.log(`  Embedding batch ${Math.floor(batchStart / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)} (${batchChunks.length} chunks)...`);
    
    // 1. Extract text content from batch
    const texts = batchChunks.map(c => c.content);

    // 2. Get embeddings for batch
    const results = await embedFn(texts);

    // 3. Build points array for batch
    const points = [];
    for (let i = 0; i < batchChunks.length; i++) {
      const chunk = batchChunks[i];
      points.push({
        id: chunk.id,
        vector: results[i],
        payload: {
          content: chunk.content,
          parent_id: chunk.parent_id,
          source_file: chunk.source_file,
          section_path: chunk.section_path,
        }
      });
    }
    
    // 4. Upload batch to Qdrant
    await client.upsert('documind_chunks', { points });
    
    console.log(`  ✓ Uploaded batch ${Math.floor(batchStart / BATCH_SIZE) + 1}`);
  }

  console.log(`Indexed ${chunks.length} chunks total`);
}

export async function searchChunks(
  query: string,
  embedFn: (texts: string[]) => Promise<number[][]>,
  limit: number = 10
): Promise<Array<{ id: number; score: number; payload: any }>> {
  
  const [queryVector] = await embedFn([query]);
  
  const results = await client.search('documind_chunks', {
    vector: queryVector,
    limit: limit,
    with_payload: true,
  });

  return results.map(result => ({
    id: Number(result.id),
    score: result.score,
    payload: result.payload
  }));
}

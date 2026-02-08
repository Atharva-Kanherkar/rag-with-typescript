// EMBEDDER: Converts text to vector embeddings using local ML model
// Uses @xenova/transformers - a JS port of Hugging Face Transformers
// Model: all-MiniLM-L6-v2 (384 dimensions, fast, good quality)

import { pipeline } from '@xenova/transformers';

// Module-level variable to cache the loaded model
// We load it once, then reuse for all embeddings (much faster)
// 'any' type because library types aren't perfect
let embedder: any = null;

/**
 * Initialize the embedding model
 * Downloads ~80MB model file on first run, loads into memory
 * Called automatically by embed() if not already loaded
 */
export async function initEmbedder() {
  // pipeline(task, modelName) creates an embedding function
  // 'feature-extraction' = the ML task (text → vectors)
  // 'Xenova/all-MiniLM-L6-v2' = small, fast model (384-dim output)
  embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
}

/**
 * Convert multiple texts to embedding vectors
 * @param texts - Array of strings to embed (e.g., ["hello", "world"])
 * @returns Array of vectors, each vector is 384 numbers (for MiniLM)
 * 
 * Example:
 *   embed(["pod status", "container state"]) 
 *   → [[0.1, -0.2, ...], [0.3, -0.1, ...]]
 */
export async function embed(texts: string[]): Promise<number[][]> {
  // Lazy initialization: load model only when first needed
  // This prevents loading if embed() is never called
  if (!embedder) await initEmbedder();

  // Array to store results - one vector per input text
  const results: number[][] = [];

  // Process texts one by one (could be batched for speed)
  for (const text of texts) {
    // Run inference through the neural network
    // pooling: 'mean' = average token vectors to get sentence vector
    // normalize: true = make vector unit length (helps with similarity)
    const output = await embedder(text, { pooling: 'mean', normalize: true });
    
    // output.data is Float32Array - convert to regular number[] for compatibility
    // This creates the 384-dimensional vector that represents the text's meaning
    results.push(Array.from(output.data));
  }

  return results;
}

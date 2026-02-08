// PARENT STORE: Simple key-value store for parent chunks
// Stores full H2 sections for context retrieval
// Why separate? Fast lookup by ID, no vectors needed
//written by kimi k2.5 was too lazy to write this one myself. sorry
import { writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { Chunk } from '../ingest/chunker.js';

// Path to store the parents JSON file
const STORE_PATH = './data/parents.json';

// In-memory cache of parents (loaded from disk)
let parentsCache: Map<number, Chunk> = new Map();

/**
 * Load parents from disk into memory cache
 * Call this at startup
 */
export async function initParentStore(): Promise<void> {
  if (existsSync(STORE_PATH)) {
    const data = await readFile(STORE_PATH, 'utf-8');
    const parents: Chunk[] = JSON.parse(data);
    
    for (const parent of parents) {
      // Parse ID as number since JSON may store it as string
      const id = typeof parent.id === 'string' ? parseInt(parent.id) : parent.id;
      parentsCache.set(id, parent);
    }
    
    console.log(`Loaded ${parentsCache.size} parents from store`);
  } else {
    console.log('Parent store not found, starting fresh');
  }
}

/**
 * Save parent chunks to the store
 * Call this after chunking all documents
 * 
 * @param parents - Array of parent chunks (chunk_type === "parent")
 */
export async function saveParents(parents: Chunk[]): Promise<void> {
  // Add to cache
  for (const parent of parents) {
    // Ensure ID is a number
    const id = typeof parent.id === 'string' ? parseInt(parent.id) : parent.id;
    parentsCache.set(id, parent);
  }
  
  // Persist to disk
  const allParents = Array.from(parentsCache.values());
  await writeFile(STORE_PATH, JSON.stringify(allParents, null, 2));
  
  console.log(`Saved ${parents.length} parents (${allParents.length} total)`);
}

/**
 * Get a single parent by ID
 * 
 * @param parentId - The parent chunk ID (e.g., "pod-lifecycle-p0")
 * @returns The parent chunk or null if not found
 */
export async function getParent(parentId: number): Promise<Chunk | null> {
  return parentsCache.get(parentId) || null;
}

/**
 * Get multiple parents by their IDs (with deduplication)
 * Used after vector search to fetch full context
 * 
 * @param parentIds - Array of parent IDs (may contain duplicates)
 * @returns Array of unique parent chunks
 * 
 * Example:
 *   Input:  ["pod-p0", "pod-p0", "deploy-p2"] (from search results)
 *   Output: [{id:"pod-p0",...}, {id:"deploy-p2",...}] (unique, in order)
 */
export async function getParents(parentIds: number[]): Promise<Chunk[]> {
  // Deduplicate while preserving order
  const seen = new Set<number>();
  const uniqueParents: Chunk[] = [];
  
  for (const id of parentIds) {
    if (!seen.has(id)) {
      seen.add(id);
      const parent = parentsCache.get(id);
      if (parent) {
        uniqueParents.push(parent);
      }
    }
  }
  
  return uniqueParents;
}

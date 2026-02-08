#!/usr/bin/env node

import { Command } from "commander";
import { loadDocuments } from "./ingest/loader.js";
import { parseDocument } from "./ingest/metadata.js";
import { chunkDocument, Chunk } from "./ingest/chunker.js";
import { initEmbedder, embed } from "./index/embedder.js";
import { initVectorDB, indexChunks } from "./index/vectordb.js";
import { initParentStore, saveParents } from "./index/parentstore.js";
import path from "path";
import { expandToParents } from "./retrieve/expander.js";
import { search } from "./retrieve/search.js";

// Phase 4: Generation imports
import { buildPrompt, buildCitationLegend } from "./generate/prompt.js";
import { processAnswer } from "./generate/citation.js";
import { checkApiKey, generateAnswer, generateAnswerStreaming } from "./generate/llm.js";

const program = new Command();

program
  .name("documind")
  .description("Document intelligence CLI")
  .version("1.0.0");

program
  .command("ingest")
  .description("Ingest and chunk documents (Phase 1)")
  .requiredOption("-s, --source <path>", "Source directory containing .md files")
  .requiredOption("-o, --output <path>", "Output directory for chunks JSON")
  .action(async (options) => {
    console.log(`📂 Loading documents from ${options.source}...`);
    const rawDocs = await loadDocuments(options.source);
    console.log(`📄 Found ${rawDocs.length} markdown files`);

    const allChunks: Chunk[] = [];

    for (const raw of rawDocs) {
      const parsed = parseDocument(raw);
      const chunks = chunkDocument(parsed, "recursive");
      allChunks.push(...chunks);
    }

    // Save to JSON
    const fs = await import("fs/promises");
    await fs.writeFile(
      path.join(options.output, "chunks.json"),
      JSON.stringify(allChunks, null, 2)
    );

    console.log(`✅ Created ${allChunks.length} chunks`);
    console.log(`   - Parents: ${allChunks.filter(c => c.chunk_type === "parent").length}`);
    console.log(`   - Children: ${allChunks.filter(c => c.chunk_type === "child").length}`);
    console.log(`💾 Saved to ${options.output}/chunks.json`);
  });

program
  .command("index")
  .description("Index documents to vector DB (Phase 2)")
  .requiredOption("-c, --chunks <path>", "Path to chunks.json file")
  .action(async (options) => {
    console.log("📖 Loading chunks...");
    const fs = await import("fs/promises");
    const chunksData = await fs.readFile(options.chunks, "utf-8");
    const chunks: Chunk[] = JSON.parse(chunksData);

    // Separate parents and children
    const parents = chunks.filter(c => c.chunk_type === "parent");
    const children = chunks.filter(c => c.chunk_type === "child");

    console.log(`📊 ${parents.length} parents, ${children.length} children`);

    // Initialize stores
    console.log("🔧 Initializing embedder...");
    await initEmbedder();
    
    console.log("🔧 Initializing vector DB...");
    await initVectorDB();
    
    console.log("🔧 Initializing parent store...");
    await initParentStore();

    // Save parents (simple key-value store)
    console.log("💾 Saving parents to store...");
    await saveParents(parents);

    // Index children (embed + upload to Qdrant)
    console.log("🧠 Indexing children to vector DB...");
    await indexChunks(children, embed);

    console.log("✅ Indexing complete!");
  });

program
  .command("query")
  .description("Query the indexed documents (Phases 3+4)")
  .requiredOption("-q, --question <text>", "Your question")
  .option("-k, --topK <number>", "Number of results", "10")
  .option("--stream", "Stream the answer (show as it generates)", false)
  .action(async (options) => {
    console.log(`🔍 Query: "${options.question}"\n`);

    // 1. Check API key before starting
    try {
      checkApiKey();
    } catch (e: any) {
      console.error(`❌ ${e.message}`);
      process.exit(1);
    }

    // 2. Initialize
    console.log("⚡ Initializing...");
    await initEmbedder();
    await initParentStore();

    // 3. Search
    console.log("🔎 Searching vector DB...");
    const searchResults = await search(options.question, parseInt(options.topK));
    console.log(`   Found ${searchResults.length} child chunks\n`);

    if (searchResults.length === 0) {
      console.log("❌ No relevant documents found. Try a different query.");
      return;
    }

    // 4. Expand to parents
    console.log("📚 Fetching parent context...");
    const parents = await expandToParents(searchResults);
    console.log(`   Expanded to ${parents.length} unique parents\n`);

    // 5. Build prompt
    console.log("📝 Building prompt...");
    const prompt = buildPrompt(options.question, parents);

    // 6. Generate answer
    console.log("🤖 Asking Claude...\n");
    console.log("=".repeat(60));
    console.log("ANSWER:");
    console.log("=".repeat(60) + "\n");

    let response: string;

    if (options.stream) {
      // Streaming mode - show answer as it arrives
      response = await generateAnswerStreaming(prompt, (chunk) => {
        process.stdout.write(chunk);
      });
      console.log("\n"); // Newline after streaming
    } else {
      // Non-streaming - wait for complete answer
      response = await generateAnswer(prompt);
      console.log(response);
    }

    // 7. Process citations
    console.log("\n" + "=".repeat(60));
    const answer = processAnswer(response, parents.length);
    
    if (answer.uniqueCitations.length > 0) {
      console.log("SOURCES:");
      console.log("=".repeat(60));
      
      const legend = buildCitationLegend(parents);
      for (const citationNum of answer.uniqueCitations) {
        const entry = legend[citationNum - 1];
        if (entry) {
          console.log(`[${citationNum}] ${entry.section}`);
          console.log(`    ${entry.source}`);
        }
      }
    }

    console.log("\n" + "-".repeat(60));
    console.log(`Confidence: ${answer.confidence.toUpperCase()}`);
    console.log(`Citations used: ${answer.uniqueCitations.length}/${parents.length} documents`);
    console.log("-".repeat(60));
  });

program
  .command("eval")
  .description("Evaluate retrieval")
  .action(() => {
    console.log("Not implemented yet - Phase 5");
  });

program
  .command("serve")
  .description("Start API server")
  .action(() => {
    console.log("Not implemented yet - Phase 6");
  });

program.parse();

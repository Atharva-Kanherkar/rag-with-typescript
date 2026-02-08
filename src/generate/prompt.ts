// PROMPT BUILDER: Constructs the LLM prompt with context and instructions
// This is CRITICAL - the prompt quality directly affects answer quality

import { Chunk } from "../ingest/chunker.js";

/**
 * Build a RAG prompt with retrieved context
 * 
 * The prompt structure follows best practices:
 * 1. System instructions (how to behave)
 * 2. Context documents (with numbered citations [1], [2], etc.)
 * 3. User question
 * 4. Expected output format
 * 
 * @param question - The user's question
 * @param parents - Array of parent chunks (retrieved context)
 * @returns Complete prompt string ready for LLM
 */
export function buildPrompt(question: string, parents: Chunk[]): string {
  // No context found - special prompt for "I don't know" cases
  if (parents.length === 0) {
    return `You are a helpful documentation assistant. 

You have access to NO relevant documents for this question.

If you don't have enough information to answer accurately, say "I don't have enough information to answer that question."

Question: ${question}

Answer:`;
  }

  // Build the context section with numbered citations
  // Each parent chunk gets a number [1], [2], etc.
  const contextSection = parents
    .map((parent, index) => {
      const citationNumber = index + 1;
      return `[${citationNumber}] Source: ${parent.source_file}\n${parent.content}`;
    })
    .join("\n\n---\n\n");

  // The complete prompt with strict instructions
  return `You are a helpful documentation assistant specializing in Kubernetes.

INSTRUCTIONS:
- Answer the question using ONLY the provided context documents below
- Cite your sources using [1], [2], etc. when you use information from them
- If the context doesn't contain the answer, say "I don't have enough information to answer that question"
- Be concise but complete
- If multiple sources support a point, cite all of them: [1][2]

CONTEXT DOCUMENTS:

${contextSection}

---

Question: ${question}

Provide your answer with citations:`;
}

/**
 * Build a citation legend for displaying to the user
 * Maps [1], [2] back to source files
 * 
 * @param parents - Array of parent chunks
 * @returns Array of { number, source, section } for display
 */
export function buildCitationLegend(parents: Chunk[]): Array<{
  number: number;
  source: string;
  section: string;
}> {
  return parents.map((parent, index) => ({
    number: index + 1,
    source: parent.source_file,
    section: parent.section_path.join(" > "),
  }));
}

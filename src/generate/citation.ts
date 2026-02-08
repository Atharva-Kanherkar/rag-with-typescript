// CITATION PARSER: Extracts [1], [2] citations from LLM responses
// Links them back to source documents

/**
 * Parse citations from LLM response text
 * Citations look like [1], [2], [1][2], etc.
 * 
 * @param response - Raw LLM response text
 * @returns Array of citation numbers found (e.g., [1, 1, 2] for "[1] and [1][2]")
 */
export function parseCitations(response: string): number[] {
  const citations: number[] = [];
  
  // Regex to find all [number] patterns
  // Matches: [1], [12], [123], etc.
  const regex = /\[(\d+)\]/g;
  
  let match;
  while ((match = regex.exec(response)) !== null) {
    const citationNumber = parseInt(match[1], 10);
    citations.push(citationNumber);
  }
  
  return citations;
}

/**
 * Get unique citation numbers (deduplicated, sorted)
 * 
 * @param citations - Array of citation numbers
 * @returns Sorted unique array
 */
export function getUniqueCitations(citations: number[]): number[] {
  return [...new Set(citations)].sort((a, b) => a - b);
}

/**
 * Structure for a complete answer with metadata
 */
export interface GeneratedAnswer {
  /** The text answer from the LLM */
  text: string;
  
  /** All citation numbers found in the answer */
  citations: number[];
  
  /** Unique citation numbers (for display) */
  uniqueCitations: number[];
  
  /** Confidence level based on citations */
  confidence: "high" | "medium" | "low";
}

/**
 * Process raw LLM response into structured answer
 * 
 * @param response - Raw LLM text
 * @param parentCount - Number of parent chunks (to validate citations)
 * @returns Structured answer with citations
 */
export function processAnswer(
  response: string,
  parentCount: number
): GeneratedAnswer {
  const allCitations = parseCitations(response);
  const uniqueCitations = getUniqueCitations(allCitations);
  
  // Validate citations (filter out invalid ones)
  const validCitations = uniqueCitations.filter(n => n >= 1 && n <= parentCount);
  
  // Determine confidence based on citation coverage
  let confidence: "high" | "medium" | "low";
  if (validCitations.length >= 2) {
    confidence = "high";
  } else if (validCitations.length === 1) {
    confidence = "medium";
  } else {
    confidence = "low"; // No citations = risky answer
  }
  
  return {
    text: response.trim(),
    citations: allCitations,
    uniqueCitations: validCitations,
    confidence,
  };
}

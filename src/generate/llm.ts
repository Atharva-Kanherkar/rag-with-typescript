// LLM CLIENT: Anthropic Claude API integration
// Handles all communication with the language model

import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";

// Load environment variables from .env file
// This lets you put ANTHROPIC_API_KEY=xxx in a file instead of exporting
dotenv.config();

// Initialize Anthropic client
// Reads API key from environment variable ANTHROPIC_API_KEY
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Check if API key is configured
 * Call this before making requests to give helpful error message
 */
export function checkApiKey(): void {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY not found!\n" +
      "Please set it in .env file or environment variable:\n" +
      "  echo 'ANTHROPIC_API_KEY=your_key_here' >> .env"
    );
  }
}

/**
 * Generate answer using Anthropic Claude
 * 
 * @param prompt - The complete prompt with context and question
 * @param options - Optional settings
 * @returns Raw text response from LLM
 */
export async function generateAnswer(
  prompt: string,
  options: {
    model?: string;      // Which Claude model to use
    maxTokens?: number;  // Maximum response length
    temperature?: number; // 0 = deterministic, 1 = creative
  } = {}
): Promise<string> {
  // Default options
  const model = options.model || "claude-3-haiku-20240307"; // Fast & cheap
  const maxTokens = options.maxTokens || 1000;
  const temperature = options.temperature || 0; // 0 = consistent answers
  
  // Call Anthropic API
  const response = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    temperature,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });
  
  // Extract text from response
  // Response format: { content: [{ type: "text", text: "..." }] }
  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from LLM");
  }
  
  return content.text;
}

/**
 * Alternative: Streaming generation (shows answer as it comes)
 * Good for long answers - user sees progress immediately
 * 
 * @param prompt - The complete prompt
 * @param onChunk - Callback for each piece of text
 */
export async function generateAnswerStreaming(
  prompt: string,
  onChunk: (text: string) => void,
  options: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  } = {}
): Promise<string> {
  const model = options.model || "claude-3-haiku-20240307";
  const maxTokens = options.maxTokens || 1000;
  const temperature = options.temperature || 0;
  
  const stream = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    temperature,
    messages: [{ role: "user", content: prompt }],
    stream: true, // Enable streaming
  });
  
  let fullText = "";
  
  for await (const chunk of stream) {
    if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
      const text = chunk.delta.text;
      fullText += text;
      onChunk(text); // Call callback with new text
    }
  }
  
  return fullText;
}

// Model options for reference:
// - "claude-3-opus-20240229"   : Best quality, slowest, most expensive
// - "claude-3-sonnet-20240229" : Good balance
// - "claude-3-haiku-20240307"  : Fastest, cheapest, good for simple Q&A

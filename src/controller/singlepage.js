import prisma from "../config/prisma.js";
import axios from "axios";
import * as cheerio from "cheerio";
import { pipeline } from "@xenova/transformers";

// Cache the model globally
let embeddingModel = null;

const getEmbeddingModel = async () => {
  if (!embeddingModel) {
    console.log("Loading embedding model...");
    embeddingModel = await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2"
    );
    console.log("Model loaded successfully!");
  }
  return embeddingModel;
};

// Function to split text into chunks
const chunkText = (text, chunkSize = 3000) => {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.substring(i, i + chunkSize));
  }
  return chunks;
};

export const savePageData = async (url) => {
  try {
    // Check if page already exists
    const existingPage = await prisma.webpage_embeddings.findMany({
      where: {
        page_url: url,
      },
    });

    if (existingPage.length > 0) {
      const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;
      const now = new Date();
      const allOlderThan5Days = existingPage.every(
        (page) => now - new Date(page.created_at) > fiveDaysMs
      );

      if (allOlderThan5Days) {
        await prisma.webpage_embeddings.deleteMany({
          where: {
            page_url: url,
          },
        });
      } else {
        return { message: "Page data already exists and is fresh" };
      }
    }

    // Scrape the webpage
    console.log(`Scraping: ${url}`);
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeout: 15000,
    });

    const $ = cheerio.load(response.data);

    $("script, style, nav, footer, header, iframe, noscript").remove();

    const title = $("title").text().trim() || $("h1").first().text().trim();
    const description = $('meta[name="description"]').attr("content") || "";
    const bodyText = $("body").text().replace(/\s+/g, " ").trim();

    // Combine content
    const fullContent = `${title} ${description} ${bodyText}`;

    if (!fullContent || fullContent.length < 50) {
      throw new Error("Insufficient content extracted from page");
    }

    // Split content into chunks
    const chunks = chunkText(fullContent, 3000);
    console.log(`Content split into ${chunks.length} chunks`);

    // Load embedding model
    const model = await getEmbeddingModel();

    // Process each chunk
    let savedCount = 0;
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      console.log(`Processing chunk ${i + 1}/${chunks.length}...`);

      // Generate embedding for this chunk
      const output = await model(chunk, { pooling: "mean", normalize: true });
      let embedding = Array.from(output.data);

      // Pad or truncate to 1536 dimensions
      if (embedding.length < 1536) {
        embedding = [
          ...embedding,
          ...new Array(1536 - embedding.length).fill(0),
        ];
      } else if (embedding.length > 1536) {
        embedding = embedding.slice(0, 1536);
      }

      // Convert to vector string
      const vectorString = `[${embedding.join(",")}]`;

      // in Store each database chunk
      await prisma.$executeRaw`
                INSERT INTO webpage_embeddings (page_url, content, embedding)
                VALUES (${url}, ${chunk}, ${vectorString}::vector)
            `;

      savedCount++;
    }

    console.log(`✅ Saved ${savedCount} chunks for ${url}`);
    return {
      message: "Page data saved successfully",
      url,
      chunks: savedCount,
      totalContentLength: fullContent.length,
    };
  } catch (error) {
    console.error("Error in savePageData:", error.message);
    throw error;
  }
};

export const findRelevantContent = async (query, pageUrl) => {
  try {
    console.log(
      `Finding relevant content for query: "${query}" in page: ${pageUrl}`
    );

    // Generate embedding for the query
    const model = await getEmbeddingModel();
    const output = await model(query, { pooling: "mean", normalize: true });
    let queryEmbedding = Array.from(output.data);

    // Pad or truncate to 1536 dimensions
    if (queryEmbedding.length < 1536) {
      queryEmbedding = [
        ...queryEmbedding,
        ...new Array(1536 - queryEmbedding.length).fill(0),
      ];
    } else if (queryEmbedding.length > 1536) {
      queryEmbedding = queryEmbedding.slice(0, 1536);
    }

    // Convert to vector string for PostgreSQL
    const vectorString = `[${queryEmbedding.join(",")}]`;

    // Search for similar content chunks from the specific page
    const relevantChunks = await prisma.$queryRaw`
            SELECT 
                id,
                page_url,
                content,
                1 - (embedding <=> ${vectorString}::vector) as similarity_score,
                created_at
            FROM webpage_embeddings
            WHERE page_url = ${pageUrl}
            ORDER BY embedding <=> ${vectorString}::vector ASC
            LIMIT 5
        `;

    console.log(`✅ Found ${relevantChunks.length} relevant chunks`);

    // Format and return results
    return relevantChunks.map((chunk) => ({
      id: chunk.id,
      content: chunk.content,
      similarity: parseFloat(chunk.similarity_score),
      pageUrl: chunk.page_url,
      createdAt: chunk.created_at,
    }));
  } catch (error) {
    console.error("Error finding relevant content:", error.message);
    throw error;
  }
};

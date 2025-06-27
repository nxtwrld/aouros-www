import { json, error } from "@sveltejs/kit";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { dev } from "$app/environment";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params }) => {
  // Only allow in development mode
  if (!dev) {
    error(404, "Not found");
  }

  const { filename } = params;

  // Validate filename (security check)
  if (!filename || !filename.endsWith(".json")) {
    error(400, "Invalid filename");
  }

  // Path to test data
  const filePath = join(process.cwd(), "testData", "transcripts", filename);

  // Check if file exists
  if (!existsSync(filePath)) {
    error(404, "Test transcript not found");
  }

  try {
    // Read and parse the test transcript
    const fileContent = readFileSync(filePath, "utf-8");
    const data = JSON.parse(fileContent);

    console.log(`📄 Serving test transcript: ${filename}`);

    return json(data, {
      headers: {
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    console.error("❌ Error reading test transcript:", err);
    error(500, "Failed to read test transcript");
  }
};

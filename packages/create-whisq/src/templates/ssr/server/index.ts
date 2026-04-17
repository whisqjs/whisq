import * as fs from "node:fs";
import * as http from "node:http";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;

// In production, serve pre-built files
// This is a minimal SSR server example — for production, consider using
// a framework like Express or Fastify with @whisq/ssr's renderToString()

const distDir = path.resolve(__dirname, "../client");
const indexHtml = path.resolve(__dirname, "../client/index.html");

const mimeTypes: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  let filePath = path.join(distDir, url.pathname);

  // Serve index.html for non-file routes (SPA fallback)
  if (!path.extname(filePath)) {
    filePath = indexHtml;
  }

  if (!fs.existsSync(filePath)) {
    filePath = indexHtml;
  }

  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] ?? "application/octet-stream";

  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { "Content-Type": contentType });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

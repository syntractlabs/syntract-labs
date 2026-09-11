import express from "express";
import { createServer } from "vite";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === "production";
const app = express();
app.use(express.json());

// ─── /api/chat — OpenAI key never leaves the server ───────────────────────
app.post("/api/chat", async (req, res) => {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// ─── Static / dev ──────────────────────────────────────────────────────────
if (isProd) {
  app.use(express.static(path.join(__dirname, "dist")));
  app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "dist/index.html")));
} else {
  const vite = await createServer({ server: { middlewareMode: true } });
  app.use(vite.middlewares);
}

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`SynTract running on port ${port}`));

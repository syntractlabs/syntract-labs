import type { Request, Response } from "express";

export default async function handler(req: Request, res: Response) {
  const { messages } = req.body;
  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages,
        max_tokens: 300,
        temperature: 0.75,
      }),
    });
    const data = await r.json() as { choices?: { message?: { content?: string } }[] };
    const reply = data.choices?.[0]?.message?.content?.trim() || "Signal lost.";
    res.json({ reply });
  } catch {
    res.status(500).json({ reply: "Signal lost. Try again." });
  }
}

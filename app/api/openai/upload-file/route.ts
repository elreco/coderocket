import fetch from "node-fetch";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPEN_AI || "",
});

export async function GET() {
  const data = await openai.files.create({
    file: await fetch("http://localhost:3000/new_conversations.jsonl"),
    purpose: "fine-tune",
  });

  return Response.json({ data });
}

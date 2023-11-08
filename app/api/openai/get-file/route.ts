import fs from "fs";

import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { OpenAIStream, StreamingTextResponse } from "ai";
import { cookies } from "next/headers";
import OpenAI from "openai";

import { Database } from "@/types_db";

const openai = new OpenAI({
  apiKey: process.env.OPEN_AI || "",
});

export async function GET() {
  const file = await openai.files.retrieveContent(
    "file-uhLVQUCnRnfQvAyD9ovXQ9mK",
  );

  // Écrire dans un fichier JSON
  console.log(file);
  fs.writeFileSync("output.json", file); // le '2' est pour l'indentation

  return Response.json(file);
}

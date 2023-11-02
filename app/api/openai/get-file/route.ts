import fs from 'fs';
import OpenAI from 'openai';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types_db';
import { OpenAIStream, StreamingTextResponse } from 'ai';

const openai = new OpenAI({
  apiKey: process.env.OPEN_AI || ''
});

export async function GET() {
  const file = await openai.files.retrieveContent("file-uhLVQUCnRnfQvAyD9ovXQ9mK");

  // Écrire dans un fichier JSON
  console.log(file);
  fs.writeFileSync('output.json', file); // le '2' est pour l'indentation

  return Response.json(file);
}

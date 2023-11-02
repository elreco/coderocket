import OpenAI from 'openai';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types_db';
import { OpenAIStream, StreamingTextResponse } from 'ai';

const openai = new OpenAI({
  apiKey: process.env.OPEN_AI || ''
});

export async function POST(req: Request) {
  if (req.method === 'POST') {
    try {
      const supabase = createRouteHandlerClient<Database>({cookies});
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) throw Error('Could not get user');
      const { prompt } = await req.json()
      if (!prompt) throw Error('Could not get prompt');

      const response = await openai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content:
              "Act as a Tailwind CSS v3 component generator. Produce the component I request using the given specifications: Only provide the raw component code. Exclude head tags, doctype, and HTML. Do not include explanations, placeholders, or comments. When images or videos are necessary, source from Lorem Picsum. If SVGs are required, use heroicons library exclusively. Supply the complete code. If the user prompt is unclear, produce a basic Tailwind card with the user prompt inside."
          },
          {
            role: 'user',
            content: `Generate a Tailwind 3 component: ${prompt}`
          }
        ],
        model: 'ft:gpt-3.5-turbo-0613:personal::8G78hB68',
        max_tokens: 2048,
        stream: true,
        temperature: 0.5,
        stop: "2048"
      });

      const stream = OpenAIStream(response)

      return new StreamingTextResponse(stream)
    } catch (err: any) {
      console.log(err);
      return new Response(
        JSON.stringify({ error: { statusCode: 500, message: err.message } }),
        {
          status: 500
        }
      );
    }
  } else {
    return new Response('Method Not Allowed', {
      headers: { Allow: 'POST' },
      status: 405
    });
  }
}


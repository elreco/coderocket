import { Database } from '@/types_db';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { OpenAIStream, StreamingTextResponse, nanoid } from 'ai';
import { cookies } from 'next/headers';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPEN_AI || ''
});

export async function POST(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', {
      headers: { Allow: 'POST' },
      status: 405
    });
  }

  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) throw Error('Could not get user');

    const { messages, id } = await req.json();

    const response = await openai.chat.completions.create({
      messages,
      model: 'ft:gpt-3.5-turbo-0613:personal::8G78hB68',
      stream: true,
      temperature: 0.5
    });
    // https://github.com/vercel-labs/ai-chatbot
    const stream = OpenAIStream(response, {
      onCompletion: async (completion: string) => {
        const payload = {
          messages: [
            ...messages,
            {
              content: completion,
              role: 'assistant'
            }
          ]
        };
        console.log(payload)
        await supabase.from('chats').update(payload).eq('id', id);
      }
    });
    return new StreamingTextResponse(stream);
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: { statusCode: 500, message: err.message } }),
      {
        status: 500
      }
    );
  }
}

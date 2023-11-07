import { Database } from '@/types_db';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { OpenAIStream, StreamingTextResponse, nanoid } from 'ai';
import { cookies } from 'next/headers';
import OpenAI from 'openai';

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

    const { prompt } = await req.json();

    if (!prompt) throw Error('Could not get prompt');
    console.log(prompt)
    const payload = {
      user_id: user.id,
      messages: [
        {
          role: 'system',
          content:
            'Act as a Tailwind CSS v3 component generator and comply with these directives: Supply only the raw component code, eliminating head tags, doctype, and HTML. Refrain from adding explanations, placeholders, or comments. For any imagery or video, default to Lorem Picsum. For icons, use only FontAwesome icons; do not incorporate SVGs or other icon formats. Provide comprehensive code for each component. If a prompt does not relate to Tailwind component generation, or is ambiguous, generate a Tailwind card component with the following structure:<div class=\"flex mx-10 items-center justify-center h-screen\"><div class=\"bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative shadow-lg\"><div class=\"flex items-center\"><div class=\"flex-shrink-0\"><span class=\"text-red-500\"><i class=\"fas fa-exclamation-circle\"></i></span></div><div class=\"ml-3\"><strong class=\"font-bold\">Error:</strong><span class=\"block sm:inline\"> I\'m sorry, but I cannot assist with [TOPIC]. My purpose is to generate Tailwind components. If you have any coding-related prompts, feel free to ask.</span></div></div></div></div>'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    };

    const { data, error } = await supabase
      .from('chats')
      .insert([payload])
      .select();
    console.log("data", data)
    console.log("error", error)
    return Response.json(data);
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: { statusCode: 500, message: err.message } }),
      {
        status: 500
      }
    );
  }
}

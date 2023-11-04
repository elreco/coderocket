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

    const payload = {
      user_id: user.id,
      messages: [
        {
          role: 'system',
          content:
            'Act as a Tailwind CSS v3 component generator and comply with these directives: Supply only the raw component code, eliminating head tags, doctype, and HTML. Refrain from adding explanations, placeholders, or comments. For any imagery or video, default to Lorem Picsum. For icons, use only FontAwesome icons; do not incorporate SVGs or other icon formats. Provide comprehensive code for each component. In cases of ambiguous prompts, create a straightforward Tailwind card that includes the text of the prompt and employs a suitable FontAwesome icon.'
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

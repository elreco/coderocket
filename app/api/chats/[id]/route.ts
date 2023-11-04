import { Database } from '@/types_db';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { OpenAIStream, StreamingTextResponse, nanoid } from 'ai';
import { cookies } from 'next/headers';
import OpenAI from 'openai';

export async function GET(req: Request, { params }) {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', {
      headers: { Allow: 'GET' },
      status: 405
    });
  }

  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) throw Error('Could not get user');

    const {id = "" } = params;
    if (!id) throw Error('Could not get id');

    const { data, error } = await supabase
      .from('chats')
      .select()
      .eq('id', id)
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
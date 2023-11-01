import { NextRequest } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPEN_AI || ''
});

export async function GET(req: NextRequest) {
  console.log(req)
  const searchParams = req.nextUrl.searchParams
  const query = searchParams.get('userPrompt')

  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content:
          "I want you to act as a Tailwind CSS v3 component generator. Generate the code for the component I request, providing only the raw code without head tags, without doctype without html, without explanations, placeholders, or comments, only the component. Use Unsplash if you need images or videos for the component. If you need svg only use svg from heroicons library nothing else. Give the full code. If you don't understand the user prompt, make a simple tailwind card with the user prompt inside."
      },
      {
        role: 'user',
        content: `Generate a Tailwind 3 component: ${query}`
      }
    ],
    model: 'ft:gpt-3.5-turbo-0613:personal::8G78hB68'
  });

  return Response.json(completion.choices[0].message.content);
}

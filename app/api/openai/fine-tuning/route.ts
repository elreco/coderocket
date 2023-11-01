import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPEN_AI || '',
});

export async function GET() {
  const data = await openai.fineTuning.jobs.create({ training_file: 'file-41r5iLyyIUD78xCCqf2h62RH', model: 'gpt-3.5-turbo' })
  return Response.json({ data })
}
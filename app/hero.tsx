'use client';
import { Container } from '../components/container';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import beautify from 'js-beautify';
import { useState } from 'react';
import { useRouter } from 'next/navigation'

const beautifyOptions: beautify.HTMLBeautifyOptions = {
  indent_inner_html: true,
  indent_body_inner_html: true,
  wrap_attributes: 'preserve',
  indent_size: 4
};

async function createGeneration(prompt: string): Promise<any> {
  try {
    const response = await fetch('/api/chats', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      console.log('Failed:', response.status, response.statusText);
      return '';
    }
    const data = await response.json()
    return data[0]
  } catch (error) {
    console.error('There was an error!', error);
    return '';
  }
}

export default function Hero() {
  const router = useRouter()
  const [prompt, setPrompt] = useState('A beautiful table');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = await createGeneration(prompt);
    router.push(`/chats/${data.id}`)
  };

  return (
    <>
      <Container className="h-screen items-center flex justify-center">
        <form
          className="mt-2 flex flex-col justify-center text-center space-y-5 sm:space-y-0 sm:flex-row items-center w-full lg:w-1/2 px-5 space-x-0 sm:space-x-3"
          onSubmit={handleSubmit}
        >
          <Input
            placeholder="Start generate a beautiful Tailwind component"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <Button type="submit">Generate</Button>
        </form>
      </Container>
    </>
  );
}

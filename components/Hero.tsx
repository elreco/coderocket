'use client';

import { Container } from './Container';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Sandpack } from '@codesandbox/sandpack-react';
import { useEffect, useState } from 'react';
import beautify from 'js-beautify';

const beautifyOptions: beautify.HTMLBeautifyOptions = {
  indent_inner_html: true,
  indent_body_inner_html: true,
  wrap_attributes: 'preserve',
  indent_size: 4,
};

async function fetchComponent(prompt: string): Promise<string> {
  try {
    const response = await fetch('/api/openai/generate-component', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      console.log('Failed:', response.status, response.statusText);
      return '';
    }

    let responseData = '';
    const reader = response.body?.getReader();
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        responseData += new TextDecoder().decode(value);
      }
    }
    return responseData;
  } catch (error) {
    console.error('There was an error!', error);
    return '';
  }
}

export function Hero() {
  const [prompt, setPrompt] = useState('');
  const [htmlContent, setHtmlContent] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const streamedText = await fetchComponent(prompt);
    setHtmlContent(beautify.html(streamedText, beautifyOptions));
  };

  const sandpackFiles = {
    '/index.html': `<!doctype html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
${htmlContent}
</body>
</html>`,
  };

  return (
    <>
      <Container className="h-screen items-center flex">
        <form className="mt-2 flex items-center w-full px-24 space-x-3" onSubmit={handleSubmit}>
          <Input
            placeholder="Start generate a beautiful Tailwind component"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <div className="w-1/3">
            <Button type="submit">Generate component</Button>
          </div>
        </form>
      </Container>
      <Container>
        <div>
          <Sandpack template="static" files={sandpackFiles} />
        </div>
      </Container>
    </>
  );
}

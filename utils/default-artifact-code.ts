export const defaultArtifactCode = {
  html: ``,
  react: `<tailwindaiArtifact title="Blank React App">
<tailwindaiFile name="index.html">
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Hello Tailwind AI</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
</tailwindaiFile>
<tailwindaiFile name="src/main.tsx">
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
</tailwindaiFile>
<tailwindaiFile name="src/App.tsx">
function App() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <h1 className="text-4xl font-bold">Hello Tailwind AI</h1>
    </div>
  )
}

export default App
</tailwindaiFile>
<tailwindFile name="components.json">
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/globals.css",
    "baseColor": "zinc",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
</tailwindFile>
<tailwindaiFile name="src/globals.css">
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 47.4% 11.2%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 47.4% 11.2%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 100% 50%;
    --destructive-foreground: 210 40% 98%;
    --ring: 215 20.2% 65.1%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 224 71% 4%;
    --foreground: 213 31% 91%;
    --muted: 223 47% 11%;
    --muted-foreground: 215.4 16.3% 56.9%;
    --accent: 216 34% 17%;
    --accent-foreground: 210 40% 98%;
    --popover: 224 71% 4%;
    --popover-foreground: 215 20.2% 65.1%;
    --border: 216 34% 17%;
    --input: 216 34% 17%;
    --card: 224 71% 4%;
    --card-foreground: 213 31% 91%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 1.2%;
    --secondary: 222.2 47.4% 11.2%;
    --secondary-foreground: 210 40% 98%;
    --destructive: 0 63% 31%;
    --destructive-foreground: 210 40% 98%;
    --ring: 216 34% 17%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply font-sans antialiased bg-background text-foreground;
  }
}
</tailwindaiFile>
<tailwindaiFile name="tailwind.config.js">
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
	],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: \`var(--radius)\`,
        md: \`calc(var(--radius) - 2px)\`,
        sm: \`calc(var(--radius) - 4px)\`,
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
</tailwindaiFile>
<tailwindaiFile name="postcss.config.cjs">
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
</tailwindaiFile>
<tailwindaiFile name="package.json">
{
  "name": "tailwind-ai-app",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "clsx": "^2.1.1",
    "class-variance-authority": "^0.7.1",
    "lucide-react": "^0.294.0",
    "radix-ui": "^1.1.2",
    "recharts": "^2.1.14",
    "react-router-dom": "^6.21.0"
  },
  "devDependencies": {
    "@types/node": "^20.3.1",
    "@types/react": "^18.0.37",
    "@types/react-dom": "^18.0.11",
    "@vitejs/plugin-react": "^4.0.0",
    "autoprefixer": "^10.4.14",
    "postcss": "^8.4.24",
    "typescript": "^5.0.2",
    "tailwindcss": "^3.3.2",
    "tailwind-merge": "^2.4.0",
    "tailwindcss-animate": "^1.0.7",
    "vite": "^4.3.9"
  }
}
</tailwindaiFile>
<tailwindaiFile name="tsconfig.json">
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,

    /* Aliases */
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
</tailwindaiFile>
<tailwindaiFile name="tsconfig.app.json">
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
</tailwindaiFile>
<tailwindaiFile name="tsconfig.node.json">
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
</tailwindaiFile>
<tailwindaiFile name="vite.config.ts">
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    minify: false,
    sourcemap: false,
    cssCodeSplit: false,
    target: "esnext",
    ssr: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
</tailwindaiFile>
<tailwindaiFile name="public/vite.svg">
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--logos" width="31.88" height="32" preserveAspectRatio="xMidYMid meet" viewBox="0 0 256 257"><defs><linearGradient id="IconifyId1813088fe1fbc01fb466" x1="-.828%" x2="57.636%" y1="7.652%" y2="78.411%"><stop offset="0%" stop-color="#41D1FF"></stop><stop offset="100%" stop-color="#BD34FE"></stop></linearGradient><linearGradient id="IconifyId1813088fe1fbc01fb467" x1="43.376%" x2="50.316%" y1="2.242%" y2="89.03%"><stop offset="0%" stop-color="#FFEA83"></stop><stop offset="8.333%" stop-color="#FFDD35"></stop><stop offset="100%" stop-color="#FFA800"></stop></linearGradient></defs><path fill="url(#IconifyId1813088fe1fbc01fb466)" d="M255.153 37.938L134.897 252.976c-2.483 4.44-8.862 4.466-11.382.048L.875 37.958c-2.746-4.814 1.371-10.646 6.827-9.67l120.385 21.517a6.537 6.537 0 0 0 2.322-.004l117.867-21.483c5.438-.991 9.574 4.796 6.877 9.62Z"></path><path fill="url(#IconifyId1813088fe1fbc01fb467)" d="M185.432.063L96.44 17.501a3.268 3.268 0 0 0-2.634 3.014l-5.474 92.456a3.268 3.268 0 0 0 3.997 3.378l24.777-5.718c2.318-.535 4.413 1.507 3.936 3.838l-7.361 36.047c-.495 2.426 1.782 4.5 4.151 3.78l15.304-4.649c2.372-.72 4.652 1.36 4.15 3.788l-11.698 56.621c-.732 3.542 3.979 5.473 5.943 2.437l1.313-2.028l72.516-144.72c1.215-2.423-.88-5.186-3.54-4.672l-25.505 4.922c-2.396.462-4.435-1.77-3.759-4.114l16.646-57.705c.677-2.35-1.37-4.583-3.769-4.113Z"></path></svg>
</tailwindaiFile>
<tailwindaiFile name="src/lib/utils.ts">
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
</tailwindaiFile>
</tailwindaiArtifact>`,
  vue: `<tailwindaiArtifact>
<tailwindaiFile name="index.html">
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Hello Tailwind AI</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
</tailwindaiFile>

<tailwindaiFile name="src/main.ts">
import { createApp } from 'vue'
import App from './App.vue'
import './globals.css'

createApp(App).mount('#app')
</tailwindaiFile>

<tailwindaiFile name="src/App.vue">
<template>
  <div class="min-h-screen flex items-center justify-center">
    <h1 class="text-4xl font-bold">Hello Tailwind AI</h1>
  </div>
</template>
</tailwindaiFile>

<tailwindFile name="components.json">
{
  "$schema": "https://shadcn-vue.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/globals.css",
    "baseColor": "zinc",
    "cssVariables": true,
    "prefix": ""
  },
  "framework": "vite",
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
</tailwindFile>

<tailwindaiFile name="src/globals.css">
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 47.4% 11.2%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 47.4% 11.2%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 100% 50%;
    --destructive-foreground: 210 40% 98%;
    --ring: 215 20.2% 65.1%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 224 71% 4%;
    --foreground: 213 31% 91%;
    --muted: 223 47% 11%;
    --muted-foreground: 215.4 16.3% 56.9%;
    --accent: 216 34% 17%;
    --accent-foreground: 210 40% 98%;
    --popover: 224 71% 4%;
    --popover-foreground: 215 20.2% 65.1%;
    --border: 216 34% 17%;
    --input: 216 34% 17%;
    --card: 224 71% 4%;
    --card-foreground: 213 31% 91%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 1.2%;
    --secondary: 222.2 47.4% 11.2%;
    --secondary-foreground: 210 40% 98%;
    --destructive: 0 63% 31%;
    --destructive-foreground: 210 40% 98%;
    --ring: 216 34% 17%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply font-sans antialiased bg-background text-foreground;
  }
}
</tailwindaiFile>

<tailwindaiFile name="tailwind.config.js">
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './src/**/*.{vue,ts}',
	],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: \`var(--radius)\`,
        md: \`calc(var(--radius) - 2px)\`,
        sm: \`calc(var(--radius) - 4px)\`,
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
</tailwindaiFile>
<tailwindaiFile name="postcss.config.cjs">
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
</tailwindaiFile>

<tailwindaiFile name="package.json">
{
  "name": "vue-tailwind-app",
  "private": true,
  "version": "0.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.3.4",
    "tailwindcss": "^3.3.2",
    "clsx": "^2.1.1",
    "class-variance-authority": "^0.7.1",
    "lucide-vue-next": "^0.474.0",
    "radix-vue": "^1.9.13"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^4.0.0",
    "vite": "^4.3.9",
    "vue-tsc": "^2.2.0",
    "@types/node": "^20.3.1",
    "@vue/tsconfig": "^0.7.0",
    "@typescript-eslint/eslint-plugin": "^5.59.0",
    "@typescript-eslint/parser": "^5.59.0",
    "autoprefixer": "^10.4.14",
    "eslint": "^8.38.0",
    "postcss": "^8.4.24",
    "typescript": "^5.0.2",
    "tailwindcss": "^3.3.2",
    "tailwind-merge": "^2.4.0",
    "tailwindcss-animate": "^1.0.7"
  }
}
</tailwindaiFile>

<tailwindaiFile name="src/vite-env.d.ts">
/// <reference types="vite/client" />
</tailwindaiFile>

<tailwindaiFile name="tsconfig.json">
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
</tailwindaiFile>
<tailwindaiFile name="tsconfig.app.json">
{
  "extends": "@vue/tsconfig/tsconfig.dom.json",
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "src/**/*.vue"]
}
</tailwindaiFile>
<tailwindaiFile name="tsconfig.node.json">
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["vite.config.ts"]
}
</tailwindaiFile>
<tailwindaiFile name="vite.config.ts">
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: "./",
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
</tailwindaiFile>
<tailwindaiFile name="public/vite.svg">
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--logos" width="31.88" height="32" preserveAspectRatio="xMidYMid meet" viewBox="0 0 256 257"><defs><linearGradient id="IconifyId1813088fe1fbc01fb466" x1="-.828%" x2="57.636%" y1="7.652%" y2="78.411%"><stop offset="0%" stop-color="#41D1FF"></stop><stop offset="100%" stop-color="#BD34FE"></stop></linearGradient><linearGradient id="IconifyId1813088fe1fbc01fb467" x1="43.376%" x2="50.316%" y1="2.242%" y2="89.03%"><stop offset="0%" stop-color="#FFEA83"></stop><stop offset="8.333%" stop-color="#FFDD35"></stop><stop offset="100%" stop-color="#FFA800"></stop></linearGradient></defs><path fill="url(#IconifyId1813088fe1fbc01fb466)" d="M255.153 37.938L134.897 252.976c-2.483 4.44-8.862 4.466-11.382.048L.875 37.958c-2.746-4.814 1.371-10.646 6.827-9.67l120.385 21.517a6.537 6.537 0 0 0 2.322-.004l117.867-21.483c5.438-.991 9.574 4.796 6.877 9.62Z"></path><path fill="url(#IconifyId1813088fe1fbc01fb467)" d="M185.432.063L96.44 17.501a3.268 3.268 0 0 0-2.634 3.014l-5.474 92.456a3.268 3.268 0 0 0 3.997 3.378l24.777-5.718c2.318-.535 4.413 1.507 3.936 3.838l-7.361 36.047c-.495 2.426 1.782 4.5 4.151 3.78l15.304-4.649c2.372-.72 4.652 1.36 4.15 3.788l-11.698 56.621c-.732 3.542 3.979 5.473 5.943 2.437l1.313-2.028l72.516-144.72c1.215-2.423-.88-5.186-3.54-4.672l-25.505 4.922c-2.396.462-4.435-1.77-3.759-4.114l16.646-57.705c.677-2.35-1.37-4.583-3.769-4.113Z"></path></svg>
</tailwindaiFile>
<tailwindaiFile name="src/lib/utils.ts">
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
</tailwindaiFile>
</tailwindaiArtifact>
`,
};

export const defaultArtifactExamples = {
  react: `<examples>
  <example>
    <user_query>Create a login page with email and password inputs.</user_query>
    <assistant_response>
      <tailwindaiArtifact>
        <tailwindaiFile name="src/App.tsx">
          import { Input } from './components/ui/input';
          import { Button } from './components/ui/button';
          import './globals.css';

          function App() {
            return (
              <div className="min-h-screen flex items-center justify-center">
                <div className="p-6 bg-white shadow-md rounded-lg max-w-sm w-full">
                  <h2 className="text-2xl font-bold mb-4 text-center">Login</h2>
                  <form>
                    <div className="mb-4">
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                      <Input type="email" placeholder="Enter your email" />
                    </div>
                    <div className="mb-4">
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                      <Input type="password" placeholder="Enter your password" />
                    </div>
                    <Button type="submit" className="w-full">Login</Button>
                  </form>
                </div>
              </div>
            );
          }

          export default App;
        </tailwindaiFile>

        <tailwindaiFile name="src/components/ui/ui/input.tsx">
          ...
        </tailwindaiFile>

        <tailwindaiFile name="src/components/ui/ui/button.tsx">
          ...
        </tailwindaiFile>
      </tailwindaiArtifact>

      Here's a simple login page setup using shadcn/ui components, TypeScript, Vite, and Tailwind CSS.
    </assistant_response>
  </example>
  <example>
    <user_query>Create a python program.</user_query>
    <assistant_response>
      I can't create a Python program.
    </assistant_response>
  </example>
  <example>
    <user_query>Create a login page with email and password inputs.</user_query>
    <assistant_response>
      <tailwindaiArtifact>
        <tailwindaiFile name="src/App.tsx">
          import { Input } from './components/ui/input';
          import { Button } from './components/ui/button';
          import './globals.css';

          function App() {
            return (
              <div className="min-h-screen flex items-center justify-center">
                <div className="p-6 bg-white shadow-md rounded-lg max-w-sm w-full">
                  <h2 className="text-2xl font-bold mb-4 text-center">Login</h2>
                  <form>
                    <div className="mb-4">
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                      <Input type="email" placeholder="Enter your email" />
                    </div>
                    <div className="mb-4">
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                      <Input type="password" placeholder="Enter your password" />
                    </div>
                    <Button type="submit" className="w-full">Login</Button>
                  </form>
                </div>
              </div>
            );
          }

          export default App;
        </tailwindaiFile>

        <tailwindaiFile name="src/components/ui/ui/input.tsx">
          ...
        </tailwindaiFile>

        <tailwindaiFile name="src/components/ui/ui/button.tsx">
          ...
        </tailwindaiFile>
      </tailwindaiArtifact>

      Here's a simple login page setup using shadcn/ui components, TypeScript, Vite, and Tailwind CSS.
    </assistant_response>
    <user_query>Remove the button from the login page.</user_query>
    <assistant_response>
      I removed the button from the login page.
      <tailwindaiArtifact>
        <tailwindaiFile name="src/App.tsx">
          import { Input } from './components/ui/input';
          import './globals.css';

          function App() {
            return (
              <div className="min-h-screen flex items-center justify-center">
                <div className="p-6 bg-white shadow-md rounded-lg max-w-sm w-full">
                  <h2 className="text-2xl font-bold mb-4 text-center">Login</h2>
                  <form>
                    <div className="mb-4">
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                      <Input type="email" placeholder="Enter your email" />
                    </div>
                    <div className="mb-4">
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                      <Input type="password" placeholder="Enter your password" />
                    </div>
                  </form>
                </div>
              </div>
            );
          }

          export default App;
        </tailwindaiFile>
        <tailwindaiFile name="src/components/ui/ui/button.tsx" action="delete" />
      </tailwindaiArtifact>
      <user_query>Move input component from ui folder to components folder.</user_query>
      <assistant_response>
        I moved the input component from ui folder to components folder.
        <tailwindaiArtifact>
          <tailwindaiFile name="src/components/ui/ui/input.tsx" action="delete" />
          <tailwindaiFile name="src/components/ui/input.tsx">
            ...
          </tailwindaiFile>
        </tailwindaiArtifact>
      </assistant_response>
    </example>
  </examples>`,
  vue: `<examples>
  <example>
    <user_query>Create a login page with email and password inputs.</user_query>
    <assistant_response>
      <tailwindaiArtifact>
        <tailwindaiFile name="src/App.vue">
          <template>
            <div class="min-h-screen flex items-center justify-center">
              <div class="p-6 bg-white shadow-md rounded-lg max-w-sm w-full">
                <h2 class="text-2xl font-bold mb-4 text-center">Login</h2>
                <form @submit.prevent="login">
                  <div class="mb-4">
                    <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
                    <Input type="email" placeholder="Enter your email" v-model="email" />
                  </div>
                  <div class="mb-4">
                    <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
                    <Input type="password" placeholder="Enter your password" v-model="password" />
                  </div>
                  <Button type="submit" class="w-full">Login</Button>
                </form>
              </div>
            </div>
          </template>

          <script setup>
          import { ref } from 'vue';
          import Input from './components/Input.vue';
          import Button from './components/Button.vue';

          const email = ref('');
          const password = ref('');

          const login = () => {
            console.log('Logging in with:', email.value, password.value);
          };
          </script>

          <style scoped>
          /* Add any additional styles if needed */
          </style>
        </tailwindaiFile>

        <tailwindaiFile name="src/components/ui/Input.vue">
          ...
        </tailwindaiFile>

        <tailwindaiFile name="src/components/ui/Button.vue">
          ...
        </tailwindaiFile>
      </tailwindaiArtifact>

      Here's a simple login page setup using Vue 3, Composition API, and Tailwind CSS.
    </assistant_response>
  </example>

  <example>
    <user_query>Create a Python program.</user_query>
    <assistant_response>
      I can't create a Python program.
    </assistant_response>
  </example>

  <example>
    <user_query>Create a login page with email and password inputs.</user_query>
    <assistant_response>
      <tailwindaiArtifact>
        <tailwindaiFile name="src/App.vue">
          <template>
            <div class="min-h-screen flex items-center justify-center">
              <div class="p-6 bg-white shadow-md rounded-lg max-w-sm w-full">
                <h2 class="text-2xl font-bold mb-4 text-center">Login</h2>
                <form @submit.prevent="login">
                  <div class="mb-4">
                    <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
                    <Input type="email" placeholder="Enter your email" v-model="email" />
                  </div>
                  <div class="mb-4">
                    <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
                    <Input type="password" placeholder="Enter your password" v-model="password" />
                  </div>
                  <Button type="submit" class="w-full">Login</Button>
                </form>
              </div>
            </div>
          </template>

          <script setup>
          import { ref } from 'vue';
          import Input from './components/ui/Input.vue';
          import Button from './components/ui/Button.vue';

          const email = ref('');
          const password = ref('');

          const login = () => {
            console.log('Logging in with:', email.value, password.value);
          };
          </script>
        </tailwindaiFile>

        <tailwindaiFile name="src/components/ui/Input.vue">
          ...
        </tailwindaiFile>

        <tailwindaiFile name="src/components/ui/Button.vue">
          ...
        </tailwindaiFile>
      </tailwindaiArtifact>

      Here's a simple login page setup using Vue 3, Composition API, and Tailwind CSS.
    </assistant_response>

    <user_query>Remove the button from the login page.</user_query>
    <assistant_response>
      I removed the button from the login page.
      <tailwindaiArtifact>
        <tailwindaiFile name="src/App.vue">
          <template>
            <div class="min-h-screen flex items-center justify-center">
              <div class="p-6 bg-white shadow-md rounded-lg max-w-sm w-full">
                <h2 class="text-2xl font-bold mb-4 text-center">Login</h2>
                <form>
                  <div class="mb-4">
                    <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
                    <Input type="email" placeholder="Enter your email" v-model="email" />
                  </div>
                  <div class="mb-4">
                    <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
                    <Input type="password" placeholder="Enter your password" v-model="password" />
                  </div>
                </form>
              </div>
            </div>
          </template>

          <script setup>
          import { ref } from 'vue';
          import Input from './components/ui/Input.vue';

          const email = ref('');
          const password = ref('');
          </script>
        </tailwindaiFile>

        <tailwindaiFile name="src/components/ui/Button.vue" action="delete" />
      </tailwindaiArtifact>
    </assistant_response>

    <user_query>Move input component from components folder to ui folder.</user_query>
    <assistant_response>
      I moved the input component from the components folder to the ui folder.
      <tailwindaiArtifact>
        <tailwindaiFile name="src/components/ui/Input.vue" action="delete" />
        <tailwindaiFile name="src/components/ui/ui/Input.vue">
          ...
        </tailwindaiFile>
      </tailwindaiArtifact>
    </assistant_response>
  </example>
</examples>
`,
};

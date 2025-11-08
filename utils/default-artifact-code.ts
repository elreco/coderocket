export const defaultArtifactCode = {
  html: ``,
  angular: `<coderocketArtifact title="Blank Angular App">
<coderocketFile name=".postcssrc.json">
{
  "plugins": {
    "@tailwindcss/postcss": {}
  }
}
</coderocketFile>
<coderocketFile name="angular.json">
{
  "$schema": "./node_modules/@angular/cli/lib/config/schema.json",
  "version": 1,
  "newProjectRoot": "projects",
  "projects": {
    "angular": {
      "projectType": "application",
      "schematics": {},
      "root": "",
      "sourceRoot": "src",
      "prefix": "app",
      "architect": {
        "build": {
          "builder": "@angular/build:application",
          "options": {
            "outputPath": {
              "base": "dist"
            },
            "browser": "src/main.ts",
            "polyfills": [
              "zone.js"
            ],
            "tsConfig": "tsconfig.app.json",
            "assets": [
              {
                "glob": "**/*",
                "input": "public"
              }
            ],
            "styles": [
              "src/styles.css"
            ]
          },
          "configurations": {
            "production": {
              "budgets": [
                {
                  "type": "initial",
                  "maximumWarning": "500kB",
                  "maximumError": "1MB"
                },
                {
                  "type": "anyComponentStyle",
                  "maximumWarning": "4kB",
                  "maximumError": "8kB"
                }
              ],
              "outputHashing": "all"
            },
            "development": {
              "optimization": false,
              "extractLicenses": false,
              "sourceMap": true
            }
          },
          "defaultConfiguration": "production"
        },
        "serve": {
          "builder": "@angular/build:dev-server",
          "configurations": {
            "production": {
              "buildTarget": "angular:build:production"
            },
            "development": {
              "buildTarget": "angular:build:development"
            }
          },
          "defaultConfiguration": "development"
        },
        "extract-i18n": {
          "builder": "@angular/build:extract-i18n"
        },
        "test": {
          "builder": "@angular/build:karma",
          "options": {
            "polyfills": [
              "zone.js",
              "zone.js/testing"
            ],
            "tsConfig": "tsconfig.spec.json",
            "assets": [
              {
                "glob": "**/*",
                "input": "public"
              }
            ],
            "styles": [
              "src/styles.css"
            ]
          }
        }
      }
    }
  }
}

</coderocketFile>
<coderocketFile name="components.json">
{
  "style": "css",
  "packageManager": "npm",
  "tailwind": {
    "css": "src/styles.css",
    "baseColor": "zinc",
    "cssVariables": true
  },
  "aliases": {
    "components": "src/app/shared/components",
    "utils": "src/app/shared/utils"
  }
}
</coderocketFile>
<coderocketFile name="package.json">
{
  "name": "angular",
  "version": "0.0.0",
  "scripts": {
    "ng": "ng",
    "dev": "ng serve",
    "build": "ng build",
    "watch": "ng build --watch --configuration development",
    "test": "ng test"
  },
  "prettier": {
    "printWidth": 100,
    "singleQuote": true,
    "overrides": [
      {
        "files": "*.html",
        "options": {
          "parser": "angular"
        }
      }
    ]
  },
  "private": true,
  "dependencies": {
    "@angular/cdk": "^20.2.10",
    "@angular/common": "^20.3.0",
    "@angular/compiler": "^20.3.0",
    "@angular/core": "^20.3.0",
    "@angular/forms": "^20.3.0",
    "@angular/platform-browser": "^20.3.0",
    "@angular/router": "^20.3.0",
    "@tailwindcss/vite": "^4.1.16",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-angular": "^0.546.0",
    "lucide-static": "^0.546.0",
    "rxjs": "~7.8.0",
    "tailwind-merge": "^3.3.1",
    "tslib": "^2.3.0",
    "zone.js": "~0.15.0"
  },
  "devDependencies": {
    "@angular/build": "^20.3.7",
    "@angular/cli": "^20.3.7",
    "@angular/compiler-cli": "^20.3.0",
    "@tailwindcss/postcss": "^4.1.16",
    "@types/jasmine": "~5.1.0",
    "jasmine-core": "~5.9.0",
    "karma": "~6.4.0",
    "karma-chrome-launcher": "~3.2.0",
    "karma-coverage": "~2.2.0",
    "karma-jasmine": "~5.1.0",
    "karma-jasmine-html-reporter": "~2.1.0",
    "postcss": "^8.5.6",
    "tailwindcss": "^4.1.16",
    "tailwindcss-animate": "^1.0.7",
    "typescript": "~5.9.2"
  }
}

</coderocketFile>
<coderocketFile name="src/app/app.config.ts">
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
  ],
};

</coderocketFile>
<coderocketFile name="src/app/app.css">

</coderocketFile>
<coderocketFile name="src/app/app.html">
<div class="min-h-screen flex items-center justify-center">
  <div class="text-center">
    <h1 class="text-4xl font-bold">{{ title }}</h1>
    <p class="text-muted-foreground mt-2">Version {{ version }}</p>
  </div>
</div>

</coderocketFile>
<coderocketFile name="src/app/app.routes.ts">
import { Routes } from '@angular/router';

export const routes: Routes = [];

</coderocketFile>
<coderocketFile name="src/app/app.spec.ts">
import { TestBed } from '@angular/core/testing';

import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Hello, angular');
  });
});

</coderocketFile>
<coderocketFile name="src/app/app.ts">
import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html',
})
export class App {
  title = 'Hello CodeRocket';
  version = '1.0.0';
}

</coderocketFile>
<coderocketFile name="src/app/shared/utils/cn.ts">
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

</coderocketFile>
<coderocketFile name="src/app/shared/utils/merge-classes.ts">
import { ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export type { ClassValue };

export function mergeClasses(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function transform(value: boolean | string): boolean {
  return typeof value === 'string' ? value === '' : value;
}

export function generateId(prefix = ''): string {
  const id = crypto.randomUUID();
  return prefix ? \`\${prefix}-\${id}\` : id;
}

</coderocketFile>
<coderocketFile name="src/app/shared/utils/number.ts">
function clamp(value: number, [min, max]: [number, number]): number {
  return Math.min(max, Math.max(min, value));
}

function roundToStep(value: number, min: number, step: number): number {
  return Math.round((value - min) / step) * step + min;
}

function convertValueToPercentage(value: number, min: number, max: number): number {
  return ((value - min) / (max - min)) * 100;
}

export { clamp, roundToStep, convertValueToPercentage };

</coderocketFile>
<coderocketFile name="src/index.html">
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Angular</title>
  <base href="/">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/x-icon" href="favicon.ico">
</head>
<body>
  <app-root></app-root>
</body>
</html>

</coderocketFile>
<coderocketFile name="src/main.ts">
import { bootstrapApplication } from '@angular/platform-browser';

import { App } from './app/app';
import { appConfig } from './app/app.config';

bootstrapApplication(App, appConfig).catch((err) => console.error(err));

</coderocketFile>
<coderocketFile name="src/styles.css">
@import "tailwindcss";
</coderocketFile>
<coderocketFile name="tsconfig.app.json">
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./out-tsc/app",
    "types": [],
    "strict": false,
    "skipLibCheck": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": false,
    "noImplicitAny": false
  },
  "include": [
    "src/**/*.ts"
  ],
  "exclude": [
    "src/**/*.spec.ts"
  ]
}

</coderocketFile>
<coderocketFile name="tsconfig.json">
{
  "compileOnSave": false,
  "compilerOptions": {
    "strict": false,
    "noImplicitOverride": false,
    "noPropertyAccessFromIndexSignature": false,
    "noImplicitReturns": false,
    "noFallthroughCasesInSwitch": false,
    "noImplicitAny": false,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "skipLibCheck": true,
    "isolatedModules": true,
    "experimentalDecorators": true,
    "importHelpers": true,
    "target": "ES2022",
    "module": "preserve",
    "baseUrl": "./",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "angularCompilerOptions": {
    "enableI18nLegacyMessageIdFormat": false,
    "strictInjectionParameters": false,
    "strictInputAccessModifiers": false,
    "typeCheckHostBindings": false,
    "strictTemplates": false
  },
  "files": [],
  "references": [
    {
      "path": "./tsconfig.app.json"
    },
    {
      "path": "./tsconfig.spec.json"
    }
  ]
}
</coderocketFile>
<coderocketFile name="tsconfig.spec.json">
/* To learn more about Typescript configuration file: https://www.typescriptlang.org/docs/handbook/tsconfig-json.html. */
/* To learn more about Angular compiler options: https://angular.dev/reference/configs/angular-compiler-options. */
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./out-tsc/spec",
    "types": [
      "jasmine"
    ]
  },
  "include": [
    "src/**/*.ts"
  ]
}

</coderocketFile>
</coderocketArtifact>`,
  react: `<coderocketArtifact title="Blank React App">
<coderocketFile name="components.json">
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
</coderocketFile>
<coderocketFile name="index.html">
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <base href="/" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Hello CodeRocket</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
</coderocketFile>
<coderocketFile name="package.json">
{
  "name": "tailwind-ai-app",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "npm run typecheck && vite",
    "typecheck": "tsc --noEmit --isolatedModules",
    "build": "npm run typecheck && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@radix-ui/react-accordion": "^1.2.0",
    "@radix-ui/react-avatar": "^1.1.0",
    "@radix-ui/react-checkbox": "^1.3.0",
    "@radix-ui/react-dialog": "^1.1.0",
    "@radix-ui/react-dropdown-menu": "^2.1.0",
    "@radix-ui/react-icons": "^1.3.0",
    "@radix-ui/react-label": "^2.1.0",
    "@radix-ui/react-popover": "^1.1.0",
    "@radix-ui/react-radio-group": "^1.3.0",
    "@radix-ui/react-scroll-area": "^1.2.0",
    "@radix-ui/react-select": "^2.2.0",
    "@radix-ui/react-separator": "^1.1.0",
    "@radix-ui/react-slider": "^1.1.0",
    "@radix-ui/react-slot": "^1.2.0",
    "@radix-ui/react-switch": "^1.1.0",
    "@radix-ui/react-tabs": "^1.1.0",
    "@radix-ui/react-toast": "^1.1.0",
    "@radix-ui/react-toggle-group": "^1.1.0",
    "@radix-ui/react-tooltip": "^1.1.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^0.511.0",
    "patch-package": "^8.0.1",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "react-router-dom": "^6.21.0",
    "recharts": "^2.1.14",
    "tailwindcss": "^4.0.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.0.0",
    "@types/node": "^20.3.1",
    "@types/react": "^18.0.37",
    "@types/react-dom": "^18.0.11",
    "@vitejs/plugin-react": "^4.4.1",
    "tailwind-merge": "^2.4.0",
    "tailwindcss-animate": "^1.0.7",
    "typescript": "^5.0.2",
    "vite": "^6.3.5"
  }
}

</coderocketFile>
<coderocketFile name="public/vite.svg">
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--logos" width="31.88" height="32" preserveAspectRatio="xMidYMid meet" viewBox="0 0 256 257"><defs><linearGradient id="IconifyId1813088fe1fbc01fb466" x1="-.828%" x2="57.636%" y1="7.652%" y2="78.411%"><stop offset="0%" stop-color="#41D1FF"></stop><stop offset="100%" stop-color="#BD34FE"></stop></linearGradient><linearGradient id="IconifyId1813088fe1fbc01fb467" x1="43.376%" x2="50.316%" y1="2.242%" y2="89.03%"><stop offset="0%" stop-color="#FFEA83"></stop><stop offset="8.333%" stop-color="#FFDD35"></stop><stop offset="100%" stop-color="#FFA800"></stop></linearGradient></defs><path fill="url(#IconifyId1813088fe1fbc01fb466)" d="M255.153 37.938L134.897 252.976c-2.483 4.44-8.862 4.466-11.382.048L.875 37.958c-2.746-4.814 1.371-10.646 6.827-9.67l120.385 21.517a6.537 6.537 0 0 0 2.322-.004l117.867-21.483c5.438-.991 9.574 4.796 6.877 9.62Z"></path><path fill="url(#IconifyId1813088fe1fbc01fb467)" d="M185.432.063L96.44 17.501a3.268 3.268 0 0 0-2.634 3.014l-5.474 92.456a3.268 3.268 0 0 0 3.997 3.378l24.777-5.718c2.318-.535 4.413 1.507 3.936 3.838l-7.361 36.047c-.495 2.426 1.782 4.5 4.151 3.78l15.304-4.649c2.372-.72 4.652 1.36 4.15 3.788l-11.698 56.621c-.732 3.542 3.979 5.473 5.943 2.437l1.313-2.028l72.516-144.72c1.215-2.423-.88-5.186-3.54-4.672l-25.505 4.922c-2.396.462-4.435-1.77-3.759-4.114l16.646-57.705c.677-2.35-1.37-4.583-3.769-4.113Z"></path></svg>
</coderocketFile>
<coderocketFile name="src/App.tsx">
function App() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <h1 className="text-4xl font-bold">Hello CodeRocket</h1>
    </div>
  );
}

export default App;

</coderocketFile>
<coderocketFile name="src/globals.css">
@import "tailwindcss";
@config "../tailwind.config.js";

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
</coderocketFile>
<coderocketFile name="src/lib/utils.ts">
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

</coderocketFile>
<coderocketFile name="src/main.tsx">
import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App.tsx";
import "./globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

</coderocketFile>
<coderocketFile name="tailwind.config.js">
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
</coderocketFile>
<coderocketFile name="tsconfig.app.json">
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
    "strict": false,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": false,
    "noImplicitAny": false,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
</coderocketFile>
<coderocketFile name="tsconfig.json">
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

    /* Linting - on désactive ou on desserre pour ne pas tout bloquer */
    "strict": false,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": false,
    "noImplicitAny": false,

    /* Aliases */
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
</coderocketFile>
<coderocketFile name="tsconfig.node.json">
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
</coderocketFile>
<coderocketFile name="vite.config.ts">
import path from "path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "/",
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
});

</coderocketFile>
</coderocketArtifact>`,
  svelte: `<coderocketArtifact title="Blank Svelte App">
<coderocketFile name="components.json">
{
	"$schema": "https://shadcn-svelte.com/schema.json",
	"tailwind": {
		"css": "src/app.css",
		"baseColor": "zinc"
	},
	"aliases": {
		"components": "$lib/components",
		"utils": "$lib/utils",
		"ui": "$lib/components/ui",
		"hooks": "$lib/hooks",
		"lib": "$lib"
	},
	"typescript": true,
	"registry": "https://shadcn-svelte.com/registry"
}

</coderocketFile>
<coderocketFile name="index.html">
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <base href="/" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>svelte</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>

</coderocketFile>
<coderocketFile name="package.json">
{
  "name": "svelte",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "npm run check && vite",
    "build": "npm run check && vite build",
    "preview": "vite preview",
    "check": "svelte-check --tsconfig ./tsconfig.app.json"
  },
  "devDependencies": {
    "@sveltejs/vite-plugin-svelte": "^6.2.1",
    "@tsconfig/svelte": "^5.0.5",
    "@types/node": "^24.6.0",
    "svelte": "^5.39.6",
    "svelte-check": "^4.3.2",
    "typescript": "~5.9.3",
    "vite": "^7.1.7"
  },
  "dependencies": {
    "@tailwindcss/vite": "^4.1.16",
    "clsx": "^2.1.1",
    "patch-package": "^8.0.1",
    "tailwind-merge": "^2.4.0",
    "tailwindcss": "^4.1.16",
    "tailwindcss-animate": "^1.0.7"
  }
}

</coderocketFile>
<coderocketFile name="public/vite.svg">
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--logos" width="31.88" height="32" preserveAspectRatio="xMidYMid meet" viewBox="0 0 256 257"><defs><linearGradient id="IconifyId1813088fe1fbc01fb466" x1="-.828%" x2="57.636%" y1="7.652%" y2="78.411%"><stop offset="0%" stop-color="#41D1FF"></stop><stop offset="100%" stop-color="#BD34FE"></stop></linearGradient><linearGradient id="IconifyId1813088fe1fbc01fb467" x1="43.376%" x2="50.316%" y1="2.242%" y2="89.03%"><stop offset="0%" stop-color="#FFEA83"></stop><stop offset="8.333%" stop-color="#FFDD35"></stop><stop offset="100%" stop-color="#FFA800"></stop></linearGradient></defs><path fill="url(#IconifyId1813088fe1fbc01fb466)" d="M255.153 37.938L134.897 252.976c-2.483 4.44-8.862 4.466-11.382.048L.875 37.958c-2.746-4.814 1.371-10.646 6.827-9.67l120.385 21.517a6.537 6.537 0 0 0 2.322-.004l117.867-21.483c5.438-.991 9.574 4.796 6.877 9.62Z"></path><path fill="url(#IconifyId1813088fe1fbc01fb467)" d="M185.432.063L96.44 17.501a3.268 3.268 0 0 0-2.634 3.014l-5.474 92.456a3.268 3.268 0 0 0 3.997 3.378l24.777-5.718c2.318-.535 4.413 1.507 3.936 3.838l-7.361 36.047c-.495 2.426 1.782 4.5 4.151 3.78l15.304-4.649c2.372-.72 4.652 1.36 4.15 3.788l-11.698 56.621c-.732 3.542 3.979 5.473 5.943 2.437l1.313-2.028l72.516-144.72c1.215-2.423-.88-5.186-3.54-4.672l-25.505 4.922c-2.396.462-4.435-1.77-3.759-4.114l16.646-57.705c.677-2.35-1.37-4.583-3.769-4.113Z"></path></svg>
</coderocketFile>
<coderocketFile name="src/App.svelte">
<div class="min-h-screen flex items-center justify-center">
  <h1 class="text-4xl font-bold">Hello CodeRocket</h1>
</div>

</coderocketFile>
<coderocketFile name="src/app.css">
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.141 0.005 285.823);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.141 0.005 285.823);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.141 0.005 285.823);
  --primary: oklch(0.21 0.006 285.885);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.967 0.001 286.375);
  --secondary-foreground: oklch(0.21 0.006 285.885);
  --muted: oklch(0.967 0.001 286.375);
  --muted-foreground: oklch(0.552 0.016 285.938);
  --accent: oklch(0.967 0.001 286.375);
  --accent-foreground: oklch(0.21 0.006 285.885);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.92 0.004 286.32);
  --input: oklch(0.92 0.004 286.32);
  --ring: oklch(0.705 0.015 286.067);
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.141 0.005 285.823);
  --sidebar-primary: oklch(0.21 0.006 285.885);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.967 0.001 286.375);
  --sidebar-accent-foreground: oklch(0.21 0.006 285.885);
  --sidebar-border: oklch(0.92 0.004 286.32);
  --sidebar-ring: oklch(0.705 0.015 286.067);
}

.dark {
  --background: oklch(0.141 0.005 285.823);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.21 0.006 285.885);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.21 0.006 285.885);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.92 0.004 286.32);
  --primary-foreground: oklch(0.21 0.006 285.885);
  --secondary: oklch(0.274 0.006 286.033);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.274 0.006 286.033);
  --muted-foreground: oklch(0.705 0.015 286.067);
  --accent: oklch(0.274 0.006 286.033);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.552 0.016 285.938);
  --chart-1: oklch(0.488 0.243 264.376);
  --chart-2: oklch(0.696 0.17 162.48);
  --chart-3: oklch(0.769 0.188 70.08);
  --chart-4: oklch(0.627 0.265 303.9);
  --chart-5: oklch(0.645 0.246 16.439);
  --sidebar: oklch(0.21 0.006 285.885);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.274 0.006 286.033);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.552 0.016 285.938);
}

@theme inline {
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
</coderocketFile>
<coderocketFile name="src/assets/svelte.svg">
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--logos" width="26.6" height="32" preserveAspectRatio="xMidYMid meet" viewBox="0 0 256 308"><path fill="#FF3E00" d="M239.682 40.707C211.113-.182 154.69-12.301 113.895 13.69L42.247 59.356a82.198 82.198 0 0 0-37.135 55.056a86.566 86.566 0 0 0 8.536 55.576a82.425 82.425 0 0 0-12.296 30.719a87.596 87.596 0 0 0 14.964 66.244c28.574 40.893 84.997 53.007 125.787 27.016l71.648-45.664a82.182 82.182 0 0 0 37.135-55.057a86.601 86.601 0 0 0-8.53-55.577a82.409 82.409 0 0 0 12.29-30.718a87.573 87.573 0 0 0-14.963-66.244"></path><path fill="#FFF" d="M106.889 270.841c-23.102 6.007-47.497-3.036-61.103-22.648a52.685 52.685 0 0 1-9.003-39.85a49.978 49.978 0 0 1 1.713-6.693l1.35-4.115l3.671 2.697a92.447 92.447 0 0 0 28.036 14.007l2.663.808l-.245 2.659a16.067 16.067 0 0 0 2.89 10.656a17.143 17.143 0 0 0 18.397 6.828a15.786 15.786 0 0 0 4.403-1.935l71.67-45.672a14.922 14.922 0 0 0 6.734-9.977a15.923 15.923 0 0 0-2.713-12.011a17.156 17.156 0 0 0-18.404-6.832a15.78 15.78 0 0 0-4.396 1.933l-27.35 17.434a52.298 52.298 0 0 1-14.553 6.391c-23.101 6.007-47.497-3.036-61.101-22.649a52.681 52.681 0 0 1-9.004-39.849a49.428 49.428 0 0 1 22.34-33.114l71.664-45.677a52.218 52.218 0 0 1 14.563-6.398c23.101-6.007 47.497 3.036 61.101 22.648a52.685 52.685 0 0 1 9.004 39.85a50.559 50.559 0 0 1-1.713 6.692l-1.35 4.116l-3.67-2.693a92.373 92.373 0 0 0-28.037-14.013l-2.664-.809l.246-2.658a16.099 16.099 0 0 0-2.89-10.656a17.143 17.143 0 0 0-18.398-6.828a15.786 15.786 0 0 0-4.402 1.935l-71.67 45.674a14.898 14.898 0 0 0-6.73 9.975a15.9 15.9 0 0 0 2.709 12.012a17.156 17.156 0 0 0 18.404 6.832a15.841 15.841 0 0 0 4.402-1.935l27.345-17.427a52.147 52.147 0 0 1 14.552-6.397c23.101-6.006 47.497 3.037 61.102 22.65a52.681 52.681 0 0 1 9.003 39.848a49.453 49.453 0 0 1-22.34 33.12l-71.664 45.673a52.218 52.218 0 0 1-14.563 6.398"></path></svg>
</coderocketFile>
<coderocketFile name="src/lib/Counter.svelte">
<script lang="ts">
  let count: number = $state(0)
  const increment = () => {
    count += 1
  }
</script>

<button onclick={increment}>
  count is {count}
</button>

</coderocketFile>
<coderocketFile name="src/lib/utils.ts">
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, "child"> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any }
  ? Omit<T, "children">
  : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & {
  ref?: U | null;
};

</coderocketFile>
<coderocketFile name="src/main.ts">
import { mount } from "svelte";

import "./app.css";
import App from "./App.svelte";

const app = mount(App, {
  target: document.getElementById("app")!,
});

export default app;

</coderocketFile>
<coderocketFile name="svelte.config.js">
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

/** @type {import("@sveltejs/vite-plugin-svelte").SvelteConfig} */
export default {
  // Consult https://svelte.dev/docs#compile-time-svelte-preprocess
  // for more information about preprocessors
  preprocess: vitePreprocess(),
}

</coderocketFile>
<coderocketFile name="tsconfig.app.json">
{
  "extends": "@tsconfig/svelte/tsconfig.json",
  "compilerOptions": {
    "baseUrl": ".",
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "types": ["svelte", "vite/client"],
    "noEmit": true,
    "allowJs": true,
    "checkJs": true,
    "moduleDetection": "force",

    /* Linting */
    "strict": false,
    "skipLibCheck": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": false,
    "noImplicitAny": false,
    "paths": {
      "@/*": ["./src/*"],
      "$lib": ["./src/lib"],
      "$lib/*": ["./src/lib/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.js", "src/**/*.svelte"]
}

</coderocketFile>
<coderocketFile name="tsconfig.json">
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ],
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "$lib": ["./src/lib"],
      "$lib/*": ["./src/lib/*"]
    }
  }
}

</coderocketFile>
<coderocketFile name="tsconfig.node.json">
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": false
  },
  "include": ["vite.config.ts"]
}

</coderocketFile>
<coderocketFile name="vite.config.ts">
import path from "path";

import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte(), tailwindcss()],
  base: "/",
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
      $lib: path.resolve("./src/lib"),
    },
  },
});

</coderocketFile>
</coderocketArtifact>`,
  vue: `<coderocketArtifact title="Blank Vue App">
<coderocketFile name="components.json">
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
</coderocketFile>
<coderocketFile name="index.html">
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <base href="/" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Hello CodeRocket</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
</coderocketFile>
<coderocketFile name="package.json">
{
  "name": "vue-tailwind-app",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vue-tsc && vite",
    "build": "vue-tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-vue-next": "^0.511.0",
    "patch-package": "^8.0.1",
    "radix-vue": "^1.9.17",
    "tailwindcss": "^4.0.0",
    "vue": "^3.3.4",
    "vue-router": "^4.3.1"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.0.0",
    "@types/node": "^20.3.1",
    "@typescript-eslint/eslint-plugin": "^5.59.0",
    "@typescript-eslint/parser": "^5.59.0",
    "@vitejs/plugin-vue": "^5.2.4",
    "@vue/tsconfig": "^0.7.0",
    "eslint": "^8.38.0",
    "tailwind-merge": "^2.4.0",
    "tailwindcss-animate": "^1.0.7",
    "typescript": "^5.0.2",
    "vite": "^6.3.5",
    "vue-tsc": "^2.2.0"
  }
}

</coderocketFile>
<coderocketFile name="public/vite.svg">
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--logos" width="31.88" height="32" preserveAspectRatio="xMidYMid meet" viewBox="0 0 256 257"><defs><linearGradient id="IconifyId1813088fe1fbc01fb466" x1="-.828%" x2="57.636%" y1="7.652%" y2="78.411%"><stop offset="0%" stop-color="#41D1FF"></stop><stop offset="100%" stop-color="#BD34FE"></stop></linearGradient><linearGradient id="IconifyId1813088fe1fbc01fb467" x1="43.376%" x2="50.316%" y1="2.242%" y2="89.03%"><stop offset="0%" stop-color="#FFEA83"></stop><stop offset="8.333%" stop-color="#FFDD35"></stop><stop offset="100%" stop-color="#FFA800"></stop></linearGradient></defs><path fill="url(#IconifyId1813088fe1fbc01fb466)" d="M255.153 37.938L134.897 252.976c-2.483 4.44-8.862 4.466-11.382.048L.875 37.958c-2.746-4.814 1.371-10.646 6.827-9.67l120.385 21.517a6.537 6.537 0 0 0 2.322-.004l117.867-21.483c5.438-.991 9.574 4.796 6.877 9.62Z"></path><path fill="url(#IconifyId1813088fe1fbc01fb467)" d="M185.432.063L96.44 17.501a3.268 3.268 0 0 0-2.634 3.014l-5.474 92.456a3.268 3.268 0 0 0 3.997 3.378l24.777-5.718c2.318-.535 4.413 1.507 3.936 3.838l-7.361 36.047c-.495 2.426 1.782 4.5 4.151 3.78l15.304-4.649c2.372-.72 4.652 1.36 4.15 3.788l-11.698 56.621c-.732 3.542 3.979 5.473 5.943 2.437l1.313-2.028l72.516-144.72c1.215-2.423-.88-5.186-3.54-4.672l-25.505 4.922c-2.396.462-4.435-1.77-3.759-4.114l16.646-57.705c.677-2.35-1.37-4.583-3.769-4.113Z"></path></svg>
</coderocketFile>
<coderocketFile name="src/App.vue">
<template>
  <div class="min-h-screen flex items-center justify-center">
    <h1 class="text-4xl font-bold">Hello CodeRocket</h1>
  </div>
</template>
</coderocketFile>
<coderocketFile name="src/globals.css">
@import "tailwindcss";
@config "../tailwind.config.js";

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
</coderocketFile>
<coderocketFile name="src/lib/utils.ts">
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

</coderocketFile>
<coderocketFile name="src/main.ts">
import { createApp } from "vue";

import App from "./App.vue";
import "./globals.css";

createApp(App).mount("#app");

</coderocketFile>
<coderocketFile name="src/vite-env.d.ts">
/// <reference types="vite/client" />

</coderocketFile>
<coderocketFile name="tailwind.config.js">
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
        lg: \\\`var(--radius)\\\`,
        md: \\\`calc(var(--radius) - 2px)\\\`,
        sm: \\\`calc(var(--radius) - 4px)\\\`,
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
</coderocketFile>
<coderocketFile name="tsconfig.app.json">
{
  "extends": "@vue/tsconfig/tsconfig.dom.json",
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",

    /* Linting */
    "strict": false,
    "skipLibCheck": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "src/**/*.vue"]
}
</coderocketFile>
<coderocketFile name="tsconfig.json">
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
</coderocketFile>
<coderocketFile name="tsconfig.node.json">
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
</coderocketFile>
<coderocketFile name="vite.config.ts">
import path from "path";

import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  base: "/",
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
});

</coderocketFile>
</coderocketArtifact>`,
};

export const defaultArtifactExamples = {
  svelte: "",
  react: `<examples>
  <example>
    <user_query>Create a login page with email and password inputs.</user_query>
    <assistant_response>
      <coderocketArtifact title="A login page with email and password inputs">
        <coderocketFile name="src/App.tsx">
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
        </coderocketFile>

        <coderocketFile name="src/components/ui/ui/input.tsx">
          ...
        </coderocketFile>

        <coderocketFile name="src/components/ui/ui/button.tsx">
          ...
        </coderocketFile>
      </coderocketArtifact>

      Here's a simple login page setup using shadcn/ui components, TypeScript, Vite, and Tailwind CSS 4.
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
      <coderocketArtifact title="A login page with email and password inputs">
        <coderocketFile name="src/App.tsx">
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
        </coderocketFile>

        <coderocketFile name="src/components/ui/ui/input.tsx">
          ...
        </coderocketFile>

        <coderocketFile name="src/components/ui/ui/button.tsx">
          ...
        </coderocketFile>
      </coderocketArtifact>

      Here's a simple login page setup using shadcn/ui components, TypeScript, Vite, and Tailwind CSS 4.
    </assistant_response>
    <user_query>Remove the button from the login page.</user_query>
    <assistant_response>
      I removed the button from the login page.
      <coderocketArtifact title="A login page with email and password inputs">
        <coderocketFile name="src/App.tsx">
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
        </coderocketFile>
        <coderocketFile name="src/components/ui/ui/button.tsx" action="delete" />
      </coderocketArtifact>
      <user_query>Move input component from ui folder to components folder.</user_query>
      <assistant_response>
        I moved the input component from ui folder to components folder.
        <coderocketArtifact title="A login page with email and password inputs">
          <coderocketFile name="src/components/ui/ui/input.tsx" action="delete" />
          <coderocketFile name="src/components/ui/input.tsx">
            ...
          </coderocketFile>
        </coderocketArtifact>
      </assistant_response>
    </example>
  </examples>`,
  vue: `<examples>
  <example>
    <user_query>Create a login page with email and password inputs.</user_query>
    <assistant_response>
      <coderocketArtifact title="A login page with email and password inputs">
        <coderocketFile name="src/App.vue">
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
        </coderocketFile>

        <coderocketFile name="src/components/ui/Input.vue">
          ...
        </coderocketFile>

        <coderocketFile name="src/components/ui/Button.vue">
          ...
        </coderocketFile>
      </coderocketArtifact>

      Here's a simple login page setup using Vue 3, Composition API, and Tailwind CSS 4.
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
      <coderocketArtifact title="A login page with email and password inputs">
        <coderocketFile name="src/App.vue">
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
        </coderocketFile>

        <coderocketFile name="src/components/ui/Input.vue">
          ...
        </coderocketFile>

        <coderocketFile name="src/components/ui/Button.vue">
          ...
        </coderocketFile>
      </coderocketArtifact>

      Here's a simple login page setup using Vue 3, Composition API, and Tailwind CSS 4.
    </assistant_response>

    <user_query>Remove the button from the login page.</user_query>
    <assistant_response>
      I removed the button from the login page.
      <coderocketArtifact title="A login page with email and password inputs">
        <coderocketFile name="src/App.vue">
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
        </coderocketFile>

        <coderocketFile name="src/components/ui/Button.vue" action="delete" />
      </coderocketArtifact>
    </assistant_response>

    <user_query>Move input component from components folder to ui folder.</user_query>
    <assistant_response>
      I moved the input component from the components folder to the ui folder.
      <coderocketArtifact title="A login page with email and password inputs">
        <coderocketFile name="src/components/ui/Input.vue" action="delete" />
        <coderocketFile name="src/components/ui/ui/Input.vue">
          ...
        </coderocketFile>
      </coderocketArtifact>
    </assistant_response>
  </example>
</examples>
`,
};

import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subdomain: string; path?: string[] }> },
) {
  const { subdomain } = await params;

  try {
    const supabase = await createClient();
    const { data: chat, error } = await supabase
      .from("chats")
      .select("id, deployed_version, is_deployed, framework")
      .eq("deploy_subdomain", subdomain)
      .eq("is_deployed", true)
      .single();

    if (error || !chat || chat.deployed_version === null) {
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Not Found - CodeRocket</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 1rem;
              }
              .container {
                text-align: center;
                max-width: 600px;
              }
              h1 {
                font-size: clamp(2rem, 5vw, 3rem);
                margin-bottom: 1rem;
              }
              p {
                font-size: clamp(1rem, 2.5vw, 1.2rem);
                opacity: 0.9;
                margin-bottom: 2rem;
              }
              a {
                display: inline-block;
                padding: 0.75rem 1.5rem;
                background: white;
                color: #667eea;
                text-decoration: none;
                border-radius: 0.5rem;
                font-weight: 600;
                transition: transform 0.2s;
              }
              a:hover {
                transform: translateY(-2px);
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>🚀 Not Found</h1>
              <p>This application is not deployed or doesn't exist.</p>
              <a href="https://www.coderocket.app">Go to CodeRocket</a>
            </div>
          </body>
        </html>
      `,
        {
          status: 404,
          headers: {
            "Content-Type": "text/html",
          },
        },
      );
    }

    const webcontainerUrl = `https://${chat.id}-${chat.deployed_version}.webcontainer.coderocket.app${request.nextUrl.pathname}${request.nextUrl.search}`;

    const proxyResponse = await fetch(webcontainerUrl, {
      headers: {
        ...Object.fromEntries(request.headers),
        host: `${chat.id}-${chat.deployed_version}.webcontainer.coderocket.app`,
      },
      redirect: "manual",
    });

    if (proxyResponse.status === 301 || proxyResponse.status === 302) {
      const location = proxyResponse.headers.get("location");
      if (location) {
        const absoluteUrl = new URL(location, webcontainerUrl);
        return NextResponse.redirect(
          absoluteUrl.toString(),
          proxyResponse.status,
        );
      }
    }

    const headers = new Headers();
    const skipHeaders = [
      "content-encoding",
      "content-length",
      "transfer-encoding",
    ];

    proxyResponse.headers.forEach((value, key) => {
      if (!skipHeaders.includes(key.toLowerCase())) {
        headers.set(key, value);
      }
    });

    headers.set("X-Proxied-From", subdomain);

    return new NextResponse(proxyResponse.body, {
      status: proxyResponse.status,
      statusText: proxyResponse.statusText,
      headers,
    });
  } catch (error) {
    console.error("Error in proxy route:", error);
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Error - CodeRocket</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
              color: white;
              padding: 1rem;
            }
            .container { text-align: center; max-width: 600px; }
            h1 { font-size: clamp(2rem, 5vw, 3rem); margin-bottom: 1rem; }
            p { font-size: clamp(1rem, 2.5vw, 1.2rem); opacity: 0.9; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>⚠️ Error</h1>
            <p>An error occurred while loading this application.</p>
          </div>
        </body>
      </html>
    `,
      {
        status: 500,
        headers: {
          "Content-Type": "text/html",
        },
      },
    );
  }
}

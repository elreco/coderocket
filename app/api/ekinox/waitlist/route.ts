import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";

const ADMIN_EMAIL = "alexandrelecorre.pro@gmail.com";
const RESEND_API_KEY = process.env.RESEND_API_KEY;

async function sendEmail(options: {
  to: string | string[];
  subject: string;
  html: string;
}) {
  if (!RESEND_API_KEY) {
    console.log("Email would be sent:", options);
    return { success: true };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Ekinox <noreply@coderocket.app>",
        to: options.to,
        subject: options.subject,
        html: options.html,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to send email");
    }

    return { success: true };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Please provide a valid email address" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    const { error: insertError } = await supabase
      .from("ekinox_waitlist")
      .insert({
        email: email.toLowerCase().trim(),
        ip_address: ip,
        user_agent: userAgent,
      });

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "This email is already on the waitlist!" },
          { status: 409 },
        );
      }
      throw insertError;
    }

    await sendEmail({
      to: email,
      subject: "Your CODEROCKET15 Promo Code is Here! 🎁",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 40px 20px;
                border-radius: 10px 10px 0 0;
                text-align: center;
              }
              .content {
                background: #f8f9fa;
                padding: 30px 20px;
                border-radius: 0 0 10px 10px;
              }
              .promo-code {
                background: #fff;
                border: 3px dashed #667eea;
                padding: 20px;
                margin: 25px 0;
                text-align: center;
                border-radius: 10px;
              }
              .promo-code-text {
                font-size: 32px;
                font-weight: bold;
                color: #667eea;
                letter-spacing: 2px;
                font-family: 'Courier New', monospace;
              }
              .discount-badge {
                display: inline-block;
                background: #10b981;
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-weight: bold;
                margin: 20px 0;
              }
              .feature {
                background: white;
                padding: 15px;
                margin: 10px 0;
                border-radius: 8px;
                border-left: 4px solid #667eea;
              }
              .cta {
                text-align: center;
                margin: 30px 0;
              }
              .cta a {
                background: #667eea;
                color: white;
                padding: 15px 30px;
                text-decoration: none;
                border-radius: 8px;
                display: inline-block;
                font-weight: bold;
                font-size: 16px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>🎉 Welcome to Ekinox!</h1>
              <p style="font-size: 18px; margin: 10px 0 0 0;">Your Exclusive Discount Code is Ready</p>
            </div>

            <div class="content">
              <p>Hey there!</p>

              <p><strong>Great news!</strong> Ekinox is now LIVE and you have an exclusive discount waiting for you! 🚀</p>

              <div class="discount-badge">✨ 15% OFF ANY PLAN ✨</div>

              <div class="promo-code">
                <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Your Exclusive Promo Code:</p>
                <div class="promo-code-text">CODEROCKET15</div>
                <p style="margin: 10px 0 0 0; font-size: 14px; color: #666;">Click to copy when you sign up!</p>
              </div>

              <h2>What is Ekinox?</h2>
              <p>Ekinox lets you create powerful AI agents in under 60 seconds. No code. No complexity. Just pure AI magic.</p>

              <div class="feature">
                <strong>⚡ Create AI Agents in 60 Seconds</strong><br>
                Visual drag-and-drop workflow builder
              </div>

              <div class="feature">
                <strong>🔌 100+ Integrations</strong><br>
                Gmail, Slack, Discord, Notion, and more
              </div>

              <div class="feature">
                <strong>🤖 AI-Powered Automation</strong><br>
                Smart workflows that actually work
              </div>

              <div class="feature">
                <strong>🚀 Deploy Instantly</strong><br>
                No setup required, start in minutes
              </div>

              <div class="cta">
                <a href="https://www.ekinox.app/signup">Start Building Your First AI Agent →</a>
              </div>

              <p style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <strong>💡 Pro Tip:</strong> Use code <strong>CODEROCKET15</strong> at checkout to get 15% off any plan!
              </p>

              <p>Ready to automate your life with AI? Click the button above and let's get started! 🎯</p>

              <p style="margin-top: 40px;">
                <strong>The Ekinox Team</strong><br>
                <em>Building the future of AI automation</em>
              </p>

              <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

              <p style="font-size: 12px; color: #666;">
                You received this email because you signed up for Ekinox at coderocket.app.
              </p>
            </div>
          </body>
        </html>
      `,
    });

    await sendEmail({
      to: ADMIN_EMAIL,
      subject: "🎯 New Ekinox Promo Code Request!",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px 20px;
                border-radius: 10px;
                text-align: center;
              }
              .content {
                background: #f8f9fa;
                padding: 20px;
                margin-top: 20px;
                border-radius: 10px;
              }
              .info-row {
                padding: 10px;
                margin: 5px 0;
                background: white;
                border-radius: 5px;
              }
              .label {
                font-weight: bold;
                color: #667eea;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>🎉 New Promo Code Request!</h1>
            </div>

            <div class="content">
              <p>Someone just requested the CODEROCKET15 promo code!</p>

              <div class="info-row">
                <span class="label">Email:</span> ${email}
              </div>

              <div class="info-row">
                <span class="label">IP Address:</span> ${ip}
              </div>

              <div class="info-row">
                <span class="label">User Agent:</span> ${userAgent}
              </div>

              <div class="info-row">
                <span class="label">Signed up at:</span> ${new Date().toLocaleString("en-US", { timeZone: "UTC" })} UTC
              </div>

              <p style="margin-top: 20px;">
                <strong>Action Items:</strong><br>
                • Promo code email sent to user ✅<br>
                • User added to database ✅<br>
                • Code: <strong>CODEROCKET15</strong> (15% off) 🎁
              </p>
            </div>
          </body>
        </html>
      `,
    });

    return NextResponse.json({
      success: true,
      message: "Successfully joined the waitlist!",
    });
  } catch (error) {
    console.error("Error in waitlist registration:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to join the waitlist",
      },
      { status: 500 },
    );
  }
}

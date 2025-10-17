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
      subject: "Welcome to the Ekinox Early Access List! 🚀",
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
              .badge {
                display: inline-block;
                background: #ffd700;
                color: #333;
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
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>🎉 You're In!</h1>
              <p style="font-size: 18px; margin: 10px 0 0 0;">Welcome to the Ekinox Early Access Community</p>
            </div>

            <div class="content">
              <p>Hey there, AI automation enthusiast!</p>

              <p>Thank you for joining the Ekinox waitlist! You're now part of an exclusive group that will experience the future of AI workflow automation before anyone else.</p>

              <div class="badge">✨ EARLY ACCESS RESERVED ✨</div>

              <h2>What You'll Get:</h2>

              <div class="feature">
                <strong>🔔 Launch Notification</strong><br>
                Be the first to know when Ekinox goes live
              </div>

              <div class="feature">
                <strong>🎁 Exclusive Discount Code</strong><br>
                Special promo code reserved just for early supporters like you
              </div>

              <div class="feature">
                <strong>⚡ Beta Access</strong><br>
                Test new features and shape the future of Ekinox
              </div>

              <h2>What is Ekinox?</h2>
              <p>Ekinox lets you create powerful AI agents in under 60 seconds. No code. No complexity. Just pure AI magic.</p>

              <ul>
                <li>Visual drag-and-drop workflow builder</li>
                <li>100+ integrations (Gmail, Slack, Discord, and more)</li>
                <li>AI-powered automation</li>
                <li>Deploy in minutes, not hours</li>
              </ul>

              <div class="cta">
                <a href="https://www.coderocket.app/ekinox">Learn More About Ekinox</a>
              </div>

              <p>We're putting the final touches on something amazing. Can't wait to share it with you!</p>

              <p>Stay tuned! 🚀</p>

              <p style="margin-top: 40px;">
                <strong>The Ekinox Team</strong><br>
                <em>Building the future of AI automation</em>
              </p>

              <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

              <p style="font-size: 12px; color: #666;">
                You received this email because you signed up for early access to Ekinox at coderocket.app.
              </p>
            </div>
          </body>
        </html>
      `,
    });

    await sendEmail({
      to: ADMIN_EMAIL,
      subject: "🎯 New Ekinox Waitlist Signup!",
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
              <h1>🎉 New Waitlist Signup!</h1>
            </div>

            <div class="content">
              <p>Someone just joined the Ekinox waitlist!</p>

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
                • Welcome email sent to user ✅<br>
                • User added to waitlist database ✅<br>
                • Remember to send them their promo code when launching! 🎁
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

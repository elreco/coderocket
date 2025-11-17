export type Highlight = {
  title: string;
  description: string;
  metric?: string;
  actionLabel?: string;
  actionUrl?: string;
  imageUrl?: string | null;
};

export type FeaturedComponent = {
  title: string;
  description: string;
  badge?: string;
  previewHtml?: string;
  actionLabel?: string;
  actionUrl?: string;
  imageUrl?: string;
};

export type TemplateOptions = {
  headline: string;
  body: string;
  ctaText: string;
  ctaUrl: string;
  previewText?: string;
  highlights?: Highlight[];
  featuredComponent?: FeaturedComponent;
};

export function renderEmailTemplate({
  headline,
  body,
  ctaText,
  ctaUrl,
  previewText,
  highlights,
  featuredComponent,
}: TemplateOptions) {
  const preview = previewText ?? body.slice(0, 140);
  const fallbackHighlights: Highlight[] = [
    {
      title: "AI Layout Blocks",
      description:
        "Spin up hero, pricing and testimonial sections with a single prompt.",
      metric: "12 new variants",
      actionLabel: "Open blocks",
      actionUrl: "https://www.coderocket.app/components",
      imageUrl: "https://www.coderocket.app/og.png",
    },
    {
      title: "Figma to React",
      description:
        "Import a frame and export responsive React + Tailwind code instantly.",
      metric: "Beta refreshed",
      actionLabel: "Browse templates",
      actionUrl: "https://www.coderocket.app/templates",
      imageUrl: "https://www.coderocket.app/og.png",
    },
    {
      title: "Ship-ready exports",
      description:
        "One-click deploy preview plus direct GitHub sync for every component.",
      metric: "4m avg build",
      actionLabel: "See how it works",
      actionUrl: "https://www.coderocket.app/pricing",
      imageUrl: "https://www.coderocket.app/og.png",
    },
  ];
  const highlightItems = (
    highlights && highlights.length > 0 ? highlights : fallbackHighlights
  ).slice(0, 3);
  const highlightMarkup = highlightItems
    .map(
      (item) => `
        <td style="width:100%;padding:8px 0;display:block;" class="highlight-cell">
          <a href="${item.actionUrl ?? "#"}" style="display:block;background:#171930;border-radius:20px;padding:24px;text-decoration:none;text-align:left;">
            ${
              item.imageUrl
                ? `<img src="${item.imageUrl}" alt="${item.title}" style="width:100%;height:auto;border-radius:14px;margin-bottom:16px;display:block;">`
                : ""
            }
            <p style="margin:0 0 6px;font-size:12px;color:#8d91c9;letter-spacing:0.18em;text-transform:uppercase;">${item.metric ?? "Update"}</p>
            <h4 style="margin:0 0 8px;font-size:17px;color:#f4f5ff;">${item.title}</h4>
            <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#c4c8ff;">${item.description}</p>
            ${
              item.actionLabel && item.actionUrl
                ? `<span style="font-size:13px;font-weight:600;color:#8b8dff;">${item.actionLabel} →</span>`
                : ""
            }
          </a>
        </td>
      `,
    )
    .join("");
  const fallbackFeatured: FeaturedComponent = {
    title: "Nova Dashboard",
    description: "Dark UI kit with stat cards, activity feed and CTA drawer.",
    badge: "New preset",
    previewHtml:
      '<table role="presentation" width="100%" style="border-collapse:collapse"><tr><td style="background:#191b2d;border-radius:16px;padding:20px;"><p style="margin:0 0 8px;font-size:13px;color:#8e92c3;letter-spacing:0.08em;text-transform:uppercase;">Insight</p><p style="margin:0;font-size:26px;color:#f5f5ff;">$42.8K</p><p style="margin:8px 0 0;font-size:12px;color:#7b80b2;">+18% vs last week</p></td><td style="width:16px;"></td><td style="background:#191b2d;border-radius:16px;padding:20px;"><p style="margin:0;font-size:14px;color:#c4c8ff;">Sessions</p><p style="margin:10px 0 0;font-size:30px;color:#f5f5ff;">12,481</p></td></tr></table>',
    actionLabel: "Duplicate component",
    actionUrl: "https://www.coderocket.app/templates",
    imageUrl: "https://www.coderocket.app/og.png",
  };
  const component = featuredComponent ?? fallbackFeatured;
  return `<!DOCTYPE html>
<html lang="en" style="background-color:#05050a;margin:0;padding:0;">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>${headline}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="dark" />
    <meta name="supported-color-schemes" content="dark light" />
    <style>
      @media only screen and (max-width: 600px) {
        .container {
          width: 100% !important;
          padding: 24px !important;
        }
        .highlight-row,
        .highlight-row tr {
          display: block !important;
        }
        .highlight-cell {
          display: block !important;
          width: 100% !important;
          padding: 8px 0 !important;
        }
        .spotlight-content {
          padding: 20px !important;
        }
        .cta-button {
          width: 100% !important;
          text-align: center !important;
        }
        .hero-text h2 {
          font-size: 20px !important;
        }
        .hero-text p {
          font-size: 15px !important;
        }
      }
      @media only screen and (max-width: 420px) {
        .hero-text h2 {
          font-size: 18px !important;
        }
        .hero-text p {
          font-size: 14px !important;
        }
        .cta-button {
          padding: 14px 16px !important;
        }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background-color:#05050a;font-family:Inter,Arial,sans-serif;color:#f4f5ff;">
    <span style="display:none;font-size:0;color:transparent;line-height:0;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preview}</span>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#05050a;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="margin:40px 0;background-color:#0e1020;border-radius:20px;padding:40px;" class="container">
            <tr>
              <td style="text-align:center;">
                <img src="https://www.coderocket.app/logo-white.png" alt="CodeRocket" width="120" style="margin-bottom:32px;">
                <h1 style="font-size:30px;margin:0 0 12px;color:#f4f5ff;">CodeRocket</h1>
                <p style="margin:0;font-size:16px;color:#b7bbff;">CodeRocket (formerly Tailwind AI) workflows without friction.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 0;" class="hero-text">
                <h2 style="margin:0 0 12px;font-size:22px;color:#f4f5ff;">${headline}</h2>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#d7d9ff;">${body}</p>
                <a href="${ctaUrl}" style="display:inline-block;padding:16px 28px;border-radius:999px;background:#6467f2;color:#05050a;text-decoration:none;font-weight:600;font-size:16px;width:fit-content;max-width:100%;box-sizing:border-box;text-align:center;" class="cta-button">${ctaText}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0 32px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="highlight-row" style="text-align:center;">
                  <tr class="highlight-row">
                    ${highlightMarkup}
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 0 32px;">
                <div style="background:#11142a;border-radius:20px;padding:28px;" class="spotlight-content">
                  <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap;">
                    ${
                      component.badge
                        ? `<span style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#8e92c3;background:#1a1d35;border-radius:999px;padding:6px 14px;">${component.badge}</span>`
                        : ""
                    }
                    <span style="font-size:13px;color:#7b80b2;">Component spotlight</span>
                  </div>
                  <h3 style="margin:0 0 8px;font-size:20px;color:#f4f5ff;">${component.title}</h3>
                  <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#c4c8ff;">${component.description}</p>
                  ${
                    component.previewHtml
                      ? `<div style="margin-bottom:20px;border:1px solid #202446;border-radius:18px;padding:18px;background:#0b0d1c;">${component.previewHtml}</div>`
                      : ""
                  }
                  ${
                    component.imageUrl
                      ? `<img src="${component.imageUrl}" alt="${component.title}" style="width:100%;border-radius:16px;margin-bottom:20px;display:block;" />`
                      : ""
                  }
                  ${
                    component.actionLabel && component.actionUrl
                      ? `<a href="${component.actionUrl}" style="display:inline-block;padding:14px 24px;border-radius:999px;font-size:14px;font-weight:600;background:#f4f5ff;color:#0b0d1c;text-decoration:none;">${component.actionLabel}</a>`
                      : ""
                  }
                </div>
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid #1e233d;padding-top:24px;">
                <p style="margin:0 0 8px;font-size:14px;color:#9da2d6;">Need help? Reply or open the in-app chat.</p>
                <p style="margin:0;font-size:12px;color:#7b80b2;">CodeRocket (formerly Tailwind AI)</p>
                <a href="{{unsubscribe}}" style="display:inline-block;margin-top:12px;font-size:12px;color:#6467f2;text-decoration:none;">Manage preferences</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

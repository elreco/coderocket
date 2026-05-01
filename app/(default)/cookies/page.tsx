import { AppFooter } from "@/components/app-footer";
import { Container } from "@/components/container";
import { PageTitle } from "@/components/page-title";
import { buildAppUrl } from "@/utils/runtime-config";

export const metadata = {
  title: "Cookie Policy - CodeRocket",
  description:
    "Cookie Policy for CodeRocket AI-powered component generation platform.",
  keywords: "cookie policy, cookies, privacy, CodeRocket",
  openGraph: {
    title: "Cookie Policy - CodeRocket",
    description:
      "Learn about how CodeRocket uses cookies and similar technologies.",
    url: buildAppUrl("/cookies"),
  },
  alternates: {
    canonical: buildAppUrl("/cookies"),
  },
};

export default function CookiePolicyPage() {
  return (
    <Container className="w-full">
      <PageTitle title="Cookie Policy" subtitle="Last updated: December 2024" />

      <div className="prose prose-gray dark:prose-invert max-w-none">
        <div className="space-y-8">
          <section>
            <h2 className="mb-4 text-2xl font-semibold">1. Introduction</h2>
            <p>
              This Cookie Policy explains how CodeRocket (&quot;we,&quot;
              &quot;our,&quot; or &quot;us&quot;) uses cookies and similar
              tracking technologies when you visit our website and use our
              Service. This policy should be read in conjunction with our{" "}
              <a href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold">
              2. What Are Cookies?
            </h2>
            <p>
              Cookies are small text files that are placed on your device when
              you visit a website. They are widely used to make websites work
              more efficiently and provide information to website owners.
            </p>
            <p className="mt-3">
              We use both session cookies (which expire when you close your
              browser) and persistent cookies (which remain on your device until
              they expire or are deleted).
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold">
              3. Types of Cookies We Use
            </h2>

            <div className="space-y-6">
              <div>
                <h3 className="mb-2 text-xl font-medium">
                  3.1 Essential Cookies
                </h3>
                <p>
                  These cookies are necessary for the Service to function
                  properly. They enable core functionality such as security,
                  network management, and accessibility.
                </p>
                <div className="mt-3 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                  <p className="text-sm">
                    <strong>Examples:</strong> Authentication cookies, session
                    management cookies, security cookies.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-xl font-medium">
                  3.2 Functional Cookies
                </h3>
                <p>
                  These cookies allow the Service to remember choices you make
                  (such as your language preference or region) and provide
                  enhanced, personalized features.
                </p>
                <div className="mt-3 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                  <p className="text-sm">
                    <strong>Examples:</strong> User preference cookies, sidebar
                    state cookies, theme preference cookies.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-xl font-medium">
                  3.3 Analytics Cookies
                </h3>
                <p>
                  These cookies help us understand how visitors interact with
                  our Service by collecting and reporting information
                  anonymously.
                </p>
                <div className="mt-3 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                  <p className="text-sm">
                    <strong>Examples:</strong> Google Analytics cookies that
                    track page views, user interactions, and navigation
                    patterns.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-xl font-medium">
                  3.4 Marketing Cookies
                </h3>
                <p>
                  These cookies are used to track visitors across websites to
                  display relevant advertisements. We may use these cookies to
                  measure the effectiveness of our marketing campaigns.
                </p>
                <div className="mt-3 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                  <p className="text-sm">
                    <strong>Note:</strong> We currently use minimal marketing
                    cookies and are committed to respecting your privacy
                    preferences.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold">
              4. Third-Party Cookies
            </h2>
            <p>
              In addition to our own cookies, we may also use various
              third-party cookies to report usage statistics of the Service and
              deliver advertisements on and through the Service.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <h3 className="mb-2 text-xl font-medium">
                  4.1 Google Analytics
                </h3>
                <p>
                  We use Google Analytics to understand how users interact with
                  our Service. Google Analytics uses cookies to collect
                  information such as how often users visit our Service, what
                  pages they visit, and what other sites they used prior to
                  coming to our Service.
                </p>
                <p className="mt-2">
                  <a
                    href="https://policies.google.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Learn more about Google&apos;s privacy practices
                  </a>
                </p>
              </div>

              <div>
                <h3 className="mb-2 text-xl font-medium">
                  4.2 Payment Processors
                </h3>
                <p>
                  When you make a payment, our payment processor (Stripe) may
                  set cookies to process your transaction securely.
                </p>
              </div>

              <div>
                <h3 className="mb-2 text-xl font-medium">
                  4.3 Authentication Services
                </h3>
                <p>
                  We use Supabase for authentication, which may set cookies to
                  maintain your session and authenticate your requests.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold">
              5. How We Use Cookies
            </h2>
            <p>We use cookies for the following purposes:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong>Authentication:</strong> To identify you when you visit
                our Service and keep you logged in
              </li>
              <li>
                <strong>Preferences:</strong> To remember your settings and
                preferences
              </li>
              <li>
                <strong>Security:</strong> To protect against fraud and maintain
                the security of our Service
              </li>
              <li>
                <strong>Analytics:</strong> To understand how our Service is
                used and improve user experience
              </li>
              <li>
                <strong>Performance:</strong> To optimize the performance and
                functionality of our Service
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold">6. Managing Cookies</h2>
            <p>
              You have the right to accept or reject cookies. Most web browsers
              automatically accept cookies, but you can usually modify your
              browser settings to decline cookies if you prefer.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <h3 className="mb-2 text-xl font-medium">
                  6.1 Browser Settings
                </h3>
                <p>
                  You can control cookies through your browser settings.
                  However, if you choose to disable cookies, some features of
                  our Service may not function properly.
                </p>
                <div className="mt-3 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                  <p className="text-sm">
                    <strong>Browser-specific instructions:</strong>
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
                    <li>
                      <a
                        href="https://support.google.com/chrome/answer/95647"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Google Chrome
                      </a>
                    </li>
                    <li>
                      <a
                        href="https://support.mozilla.org/en-US/kb/enable-and-disable-cookies-website-preferences"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Mozilla Firefox
                      </a>
                    </li>
                    <li>
                      <a
                        href="https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Safari
                      </a>
                    </li>
                    <li>
                      <a
                        href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Microsoft Edge
                      </a>
                    </li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-xl font-medium">6.2 Opt-Out Tools</h3>
                <p>
                  You can opt out of certain third-party cookies by visiting
                  their opt-out pages:
                </p>
                <ul className="list-disc space-y-1 pl-6">
                  <li>
                    <a
                      href="https://tools.google.com/dlpage/gaoptout"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Google Analytics Opt-out
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold">
              7. Do Not Track Signals
            </h2>
            <p>
              Some browsers include a &quot;Do Not Track&quot; (DNT) feature
              that signals to websites you visit that you do not want to have
              your online activity tracked. Currently, there is no standard for
              how DNT signals should be interpreted. As a result, our Service
              does not currently respond to DNT signals.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold">8. Cookie Retention</h2>
            <p>
              The length of time a cookie will stay on your device depends on
              whether it is a &quot;persistent&quot; or &quot;session&quot;
              cookie. Session cookies will only stay on your device until you
              stop browsing. Persistent cookies stay on your device until they
              expire or are deleted.
            </p>
            <div className="mt-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
              <p className="text-sm">
                <strong>Typical retention periods:</strong>
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
                <li>Session cookies: Until browser is closed</li>
                <li>Authentication cookies: Up to 30 days</li>
                <li>Preference cookies: Up to 1 year</li>
                <li>Analytics cookies: Up to 2 years</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold">
              9. Updates to This Cookie Policy
            </h2>
            <p>
              We may update this Cookie Policy from time to time to reflect
              changes in our practices or for other operational, legal, or
              regulatory reasons. We will notify you of any material changes by
              posting the new Cookie Policy on this page and updating the
              &quot;Last updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold">10. Contact Us</h2>
            <p>
              If you have any questions about this Cookie Policy or our use of
              cookies, please contact us:
            </p>
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
              <p>
                <strong>Email:</strong> alexandrelecorre.pro@gmail.com
              </p>
              <p>
                <strong>Support:</strong> alexandrelecorre.pro@gmail.com
              </p>
              <p>
                <strong>Website:</strong> https://www.coderocket.app
              </p>
            </div>
          </section>
        </div>
      </div>
      <AppFooter />
    </Container>
  );
}

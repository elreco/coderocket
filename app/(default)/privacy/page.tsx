import { Container } from "@/components/container";
import { PageTitle } from "@/components/page-title";

export const metadata = {
  title: "Privacy Policy - CodeRocket",
  description:
    "Privacy Policy for CodeRocket AI-powered component generation platform.",
};

export default function PrivacyPage() {
  return (
    <Container className="max-w-4xl">
      <PageTitle
        title="Privacy Policy"
        subtitle="Last updated: December 2024"
      />

      <div className="prose prose-gray dark:prose-invert max-w-none">
        <div className="space-y-8">
          <section>
            <h2 className="mb-4 text-2xl font-semibold">1. Introduction</h2>
            <p>
              CodeRocket (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is
              committed to protecting your privacy. This Privacy Policy explains
              how we collect, use, disclose, and safeguard your information when
              you use our AI-powered component generation platform and
              marketplace.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold">
              2. Information We Collect
            </h2>

            <div className="space-y-4">
              <div>
                <h3 className="mb-2 text-xl font-medium">
                  2.1 Personal Information
                </h3>
                <p>
                  We collect information that you provide directly to us,
                  including:
                </p>
                <ul className="list-disc space-y-1 pl-6">
                  <li>Name and email address when you create an account</li>
                  <li>
                    Payment information for subscriptions and marketplace
                    transactions
                  </li>
                  <li>Profile information and preferences</li>
                  <li>Communications you send to us</li>
                </ul>
              </div>

              <div>
                <h3 className="mb-2 text-xl font-medium">
                  2.2 Usage Information
                </h3>
                <p>
                  We automatically collect information about your use of our
                  Service, including:
                </p>
                <ul className="list-disc space-y-1 pl-6">
                  <li>Component generation prompts and preferences</li>
                  <li>Generated components and modifications</li>
                  <li>Marketplace activity (purchases, sales, listings)</li>
                  <li>Usage patterns and feature interactions</li>
                </ul>
              </div>

              <div>
                <h3 className="mb-2 text-xl font-medium">
                  2.3 Technical Information
                </h3>
                <p>We collect technical information to improve our Service:</p>
                <ul className="list-disc space-y-1 pl-6">
                  <li>IP address and device information</li>
                  <li>Browser type and version</li>
                  <li>Operating system and platform</li>
                  <li>Cookies and similar tracking technologies</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold">
              3. How We Use Your Information
            </h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong>Provide and improve our Service:</strong> Generate
                components, process payments, and enhance user experience
              </li>
              <li>
                <strong>Train and improve our AI models:</strong> Use anonymized
                data to improve component generation quality
              </li>
              <li>
                <strong>Communicate with you:</strong> Send service updates,
                marketing communications, and support responses
              </li>
              <li>
                <strong>Ensure security and compliance:</strong> Detect fraud,
                enforce our terms, and comply with legal obligations
              </li>
              <li>
                <strong>Personalize your experience:</strong> Customize content
                and recommendations based on your preferences
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold">
              4. Information Sharing and Disclosure
            </h2>

            <div className="space-y-4">
              <div>
                <h3 className="mb-2 text-xl font-medium">
                  4.1 With Your Consent
                </h3>
                <p>
                  We may share your information when you give us explicit
                  consent to do so.
                </p>
              </div>

              <div>
                <h3 className="mb-2 text-xl font-medium">
                  4.2 Service Providers
                </h3>
                <p>
                  We work with third-party service providers who help us operate
                  our Service, including:
                </p>
                <ul className="list-disc space-y-1 pl-6">
                  <li>Payment processors (Stripe)</li>
                  <li>Cloud hosting providers (Vercel, Supabase)</li>
                  <li>Analytics services</li>
                  <li>Customer support tools</li>
                </ul>
              </div>

              <div>
                <h3 className="mb-2 text-xl font-medium">
                  4.3 Legal Requirements
                </h3>
                <p>
                  We may disclose your information if required by law or in
                  response to valid legal requests.
                </p>
              </div>

              <div>
                <h3 className="mb-2 text-xl font-medium">
                  4.4 Business Transfers
                </h3>
                <p>
                  In the event of a merger, acquisition, or sale of assets, your
                  information may be transferred as part of the transaction.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold">5. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to
              protect your personal information against unauthorized access,
              alteration, disclosure, or destruction. However, no method of
              transmission over the internet is 100% secure.
            </p>
            <div className="mt-4 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
              <p className="text-sm">
                <strong>Security measures include:</strong> Encryption in
                transit and at rest, secure authentication, regular security
                audits, and limited access controls.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold">
              6. Your Rights and Choices
            </h2>

            <div className="space-y-4">
              <div>
                <h3 className="mb-2 text-xl font-medium">
                  6.1 Access and Correction
                </h3>
                <p>
                  You can access and update your account information through
                  your profile settings.
                </p>
              </div>

              <div>
                <h3 className="mb-2 text-xl font-medium">
                  6.2 Data Portability
                </h3>
                <p>
                  You can export your generated components and related data at
                  any time.
                </p>
              </div>

              <div>
                <h3 className="mb-2 text-xl font-medium">6.3 Deletion</h3>
                <p>
                  You can request deletion of your account and associated data
                  by contacting us.
                </p>
              </div>

              <div>
                <h3 className="mb-2 text-xl font-medium">
                  6.4 Marketing Preferences
                </h3>
                <p>
                  You can opt out of marketing communications at any time using
                  the unsubscribe link in our emails.
                </p>
              </div>

              <div>
                <h3 className="mb-2 text-xl font-medium">6.5 Cookies</h3>
                <p>
                  You can control cookie preferences through your browser
                  settings, though this may affect Service functionality.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold">
              7. AI Training and Model Improvement
            </h2>
            <div className="space-y-3">
              <p>
                <strong>7.1 Data Usage for AI Training:</strong> We may use
                anonymized and aggregated data from component generation to
                improve our AI models and Service quality.
              </p>
              <p>
                <strong>7.2 Opt-out:</strong> You can opt out of having your
                data used for AI training by contacting us. This will not affect
                your current Service access.
              </p>
              <p>
                <strong>7.3 Privacy Protection:</strong> Any data used for
                training is stripped of personally identifiable information and
                aggregated with other users&apos; data.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold">
              8. International Data Transfers
            </h2>
            <p>
              Your information may be processed and stored in countries other
              than your own. We ensure adequate protection through appropriate
              safeguards such as standard contractual clauses and adequacy
              decisions.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold">9. Data Retention</h2>
            <p>
              We retain your personal information for as long as necessary to
              provide our Service and fulfill the purposes described in this
              policy. Account data is typically retained for the lifetime of
              your account plus a reasonable period thereafter.
            </p>
            <div className="mt-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
              <p className="text-sm">
                <strong>Retention periods:</strong>
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
                <li>Account information: Until account deletion + 30 days</li>
                <li>
                  Generated components: Until manual deletion or account
                  termination
                </li>
                <li>Payment data: As required by law and payment processors</li>
                <li>Analytics data: Up to 2 years in anonymized form</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold">
              10. Children&apos;s Privacy
            </h2>
            <p>
              Our Service is not intended for children under 13 years of age. We
              do not knowingly collect personal information from children under
              13. If you become aware that a child has provided us with personal
              information, please contact us.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold">
              11. Regional Privacy Rights
            </h2>

            <div className="space-y-4">
              <div>
                <h3 className="mb-2 text-xl font-medium">
                  11.1 European Users (GDPR)
                </h3>
                <p>
                  If you are in the European Economic Area, you have additional
                  rights under GDPR, including:
                </p>
                <ul className="list-disc space-y-1 pl-6">
                  <li>Right to access, rectify, or erase your personal data</li>
                  <li>Right to restrict or object to processing</li>
                  <li>Right to data portability</li>
                  <li>
                    Right to lodge a complaint with supervisory authorities
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="mb-2 text-xl font-medium">
                  11.2 California Users (CCPA)
                </h3>
                <p>
                  California residents have rights under CCPA, including the
                  right to know, delete, and opt-out of the sale of personal
                  information.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold">
              12. Changes to This Privacy Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. We will
              notify you of any material changes by posting the new Privacy
              Policy on this page and updating the &quot;Last updated&quot;
              date. We encourage you to review this Privacy Policy periodically.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold">13. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy or our privacy
              practices, please contact us:
            </p>
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
              <p>
                <strong>Email:</strong> privacy@coderocket.app
              </p>
              <p>
                <strong>Support:</strong> support@coderocket.app
              </p>
              <p>
                <strong>Website:</strong> https://www.coderocket.app
              </p>
            </div>
          </section>
        </div>
      </div>
    </Container>
  );
}

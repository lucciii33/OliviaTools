import { Link } from "react-router"
import { Sparkles } from "lucide-react"

const LAST_UPDATED = "July 23, 2026"
const CONTACT_EMAIL = "support@oliviatool.com"

const sections = [
  {
    title: "1. Agreement to these terms",
    body: [
      "These Terms of Service (“Terms”) are a contract between you and Olivia Tool (“Olivia”, “we”, “us”). By creating an account or using the service, you agree to these Terms. If you are using Olivia on behalf of a company, you confirm you are authorized to accept these Terms for it.",
    ],
  },
  {
    title: "2. The service",
    body: [
      "Olivia generates documentation and runs QA for the APIs and MCP servers you connect. Features, limits, and availability may change as we improve the product. We may add, modify, or discontinue parts of the service at any time.",
    ],
  },
  {
    title: "3. Your account",
    list: [
      "You must provide accurate registration information and keep it up to date.",
      "You are responsible for keeping your password and any connected credentials secure, and for all activity under your account.",
      "You must be old enough to form a binding contract in your country to use Olivia.",
      "Tell us promptly at the address below if you suspect any unauthorized use of your account.",
    ],
  },
  {
    title: "4. Workspaces and members",
    body: [
      "Your account belongs to a workspace. Workspace owners can invite members and manage access. If you join a workspace by invitation, the owner controls that workspace's projects and may manage or remove your access to it.",
    ],
  },
  {
    title: "5. Acceptable use",
    list: [
      "Only connect repositories, APIs, and MCP servers you own or are authorized to test.",
      "Do not use Olivia to break into, overload, or attack systems you do not have permission to test.",
      "Do not upload unlawful content or infringe anyone's intellectual property or privacy.",
      "Do not attempt to disrupt, reverse engineer, or abuse the service or its infrastructure.",
    ],
  },
  {
    title: "6. Your content",
    body: [
      "You keep ownership of the code, schemas, and other content you connect (“Your Content”). You grant us the limited right to process Your Content solely to provide the service to you — for example, to generate documentation and run QA. We handle Your Content as described in our Privacy Policy.",
    ],
  },
  {
    title: "7. Third-party integrations and API keys",
    body: [
      "Olivia connects to third-party services (such as GitHub, your MCP servers, and AI providers). When you connect an integration or add an API key, you authorize us to use it to run the features you enable, and you agree to that provider's own terms. You are responsible for any usage and costs incurred on your own connected accounts and keys.",
    ],
  },
  {
    title: "8. Payment and subscriptions",
    list: [
      "Paid plans are billed through our payment processor, Stripe. By subscribing, you authorize the recurring charges for your plan.",
      "Fees are non-refundable except where required by law. You can cancel at any time, and cancellation takes effect at the end of the current billing period.",
      "We may change pricing with reasonable notice before the change applies to you.",
    ],
  },
  {
    title: "9. Termination",
    body: [
      "You can stop using Olivia and close your account at any time. We may suspend or terminate your access if you breach these Terms or use the service in a way that risks harm to us or others. On termination, your right to use the service ends, and we handle your data as described in our Privacy Policy.",
    ],
  },
  {
    title: "10. Disclaimers",
    body: [
      "Olivia is provided “as is” and “as available”, without warranties of any kind. The documentation and QA results we generate are aids, not guarantees — you are responsible for reviewing them before relying on them. We do not warrant that the service will be uninterrupted, error-free, or fit for a particular purpose.",
    ],
  },
  {
    title: "11. Limitation of liability",
    body: [
      "To the maximum extent permitted by law, Olivia will not be liable for any indirect, incidental, or consequential damages, or for lost profits or data. Our total liability for any claim relating to the service is limited to the amount you paid us in the twelve months before the claim.",
    ],
  },
  {
    title: "12. Changes to these terms",
    body: [
      "We may update these Terms from time to time. When we do, we will update the date at the top of this page and, for significant changes, notify you in the app or by email. Continuing to use Olivia after a change means you accept the updated Terms.",
    ],
  },
  {
    title: "13. Contact",
    body: [
      `If you have any questions about these Terms, reach us at ${CONTACT_EMAIL}.`,
    ],
  },
]

export default function Terms() {
  return (
    <div className="min-h-screen bg-[#090a0d] text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#090a0d]/90 px-5 py-4 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 text-white">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-400/10">
              <Sparkles className="h-4 w-4 text-cyan-200" />
            </div>
            <div className="leading-tight">
              <span className="block text-sm font-semibold">Olivia Tool</span>
              <span className="block text-[11px] text-white/45">Terms of Service</span>
            </div>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-12 md:px-8 md:py-16">
        <h1 className="text-3xl font-semibold text-white">Terms of Service</h1>
        <p className="mt-2 text-sm text-white/45">Last updated: {LAST_UPDATED}</p>
        <p className="mt-6 text-sm leading-7 text-white/65">
          These terms explain the rules for using Olivia. We keep them short and
          plain. By creating an account you agree to them and to our{" "}
          <Link to="/privacy" className="text-cyan-200 hover:text-cyan-100 underline">
            Privacy Policy
          </Link>
          .
        </p>

        <div className="mt-10 space-y-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-semibold text-white">{section.title}</h2>
              {section.body?.map((paragraph) => (
                <p key={paragraph} className="mt-2 text-sm leading-7 text-white/65">
                  {paragraph}
                </p>
              ))}
              {section.list && (
                <ul className="mt-3 space-y-2">
                  {section.list.map((item) => (
                    <li
                      key={item}
                      className="flex gap-2 text-sm leading-7 text-white/65"
                    >
                      <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-cyan-300/70" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <div className="mt-12 border-t border-white/10 pt-6">
          <Link to="/" className="text-sm text-cyan-200 hover:text-cyan-100">
            &larr; Back to home
          </Link>
        </div>
      </main>
    </div>
  )
}

import { Link } from "react-router"
import { Sparkles } from "lucide-react"

const LAST_UPDATED = "May 28, 2026"
const CONTACT_EMAIL = "support@oliviatool.com"

const sections = [
  {
    title: "1. Who we are",
    body: [
      "Olivia Tool (“Olivia”, “we”, “us”) generates documentation and runs QA for APIs and MCP servers. This policy explains what we collect, why we collect it, and the choices you have.",
    ],
  },
  {
    title: "2. Information we collect",
    list: [
      "Account data: your name, email, password (stored hashed), and workspace membership.",
      "Project data: repositories, MCP server URLs, tool schemas, sample arguments, and the documentation and QA results we generate from them.",
      "Usage data: basic logs such as IP address, browser type, and the actions you take in the app, used to keep the service secure and reliable.",
    ],
  },
  {
    title: "3. How we use your information",
    list: [
      "To generate documentation and run QA on the APIs and MCP servers you connect.",
      "To authenticate you, manage your workspace, and provide support.",
      "To secure the service, prevent abuse, and debug problems.",
      "To communicate important account and service updates.",
    ],
  },
  {
    title: "4. What we do not do",
    list: [
      "We do not sell your personal data.",
      "We do not use your private code or tool responses to train third-party models.",
      "We do not share your project data with other workspaces.",
    ],
  },
  {
    title: "5. How we share information",
    body: [
      "We share data only with service providers that help us run Olivia (such as hosting and infrastructure), and only as needed to operate the service. We may also disclose information if required by law or to protect the rights and safety of our users.",
    ],
  },
  {
    title: "6. Data retention",
    body: [
      "We keep your data for as long as your account is active. You can delete projects at any time, and when you close your account we delete or anonymize your personal data within a reasonable period, unless we are required to keep it for legal reasons.",
    ],
  },
  {
    title: "7. Security",
    body: [
      "We use industry-standard measures to protect your data, including encryption in transit and hashed passwords. No system is perfectly secure, but we work to keep your information safe.",
    ],
  },
  {
    title: "8. Your rights",
    body: [
      "Depending on where you live, you may have the right to access, correct, export, or delete your personal data. To make a request, contact us using the email below.",
    ],
  },
  {
    title: "9. Changes to this policy",
    body: [
      "We may update this policy from time to time. When we do, we will update the date at the top of this page and, for significant changes, notify you in the app or by email.",
    ],
  },
  {
    title: "10. Contact",
    body: [
      `If you have any questions about this policy or your data, reach us at ${CONTACT_EMAIL}.`,
    ],
  },
]

export default function Privacy() {
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
              <span className="block text-[11px] text-white/45">Privacy Policy</span>
            </div>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-12 md:px-8 md:py-16">
        <h1 className="text-3xl font-semibold text-white">Privacy Policy</h1>
        <p className="mt-2 text-sm text-white/45">Last updated: {LAST_UPDATED}</p>
        <p className="mt-6 text-sm leading-7 text-white/65">
          We keep this short and plain. Olivia documents and tests your APIs and
          MCP servers, so we only collect what we need to do that well and keep
          your account secure.
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

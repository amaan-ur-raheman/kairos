import { createFileRoute } from "@tanstack/react-router";

import { LegalPage, LegalSection } from "@/components/legal-page";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Kairos" },
      { name: "description", content: "The terms that apply when you use Kairos." },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: "https://kairos.noctura.dpdns.org/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="August 24, 2026">
      <p>
        These terms govern your use of Kairos. By creating an account or using the service, you
        agree to use it lawfully and responsibly.
      </p>
      <LegalSection title="Using Kairos">
        <p>
          You are responsible for keeping your account secure and for the information you add to
          your workspace. You must not misuse the service, attempt to access another user&apos;s
          account, or interfere with the operation or security of Kairos.
        </p>
      </LegalSection>
      <LegalSection title="Workspace responsibility">
        <p>
          Workspace administrators are responsible for inviting the right people and managing access
          to workspace information. Team availability and event details may be visible to members of
          the workspace according to its settings.
        </p>
      </LegalSection>
      <LegalSection title="Service availability">
        <p>
          We work to keep Kairos reliable, but the service may occasionally be unavailable for
          maintenance, updates, or circumstances outside our control. Features may change as the
          product develops.
        </p>
      </LegalSection>
      <LegalSection title="Termination">
        <p>
          You may stop using Kairos at any time. We may suspend or terminate access when necessary
          to protect the service, users, or the rights of others, or when these terms are violated.
        </p>
      </LegalSection>
      <LegalSection title="Contact">
        <p>Questions about these terms can be sent to shadowmonarch15125@gmail.com.</p>
      </LegalSection>
    </LegalPage>
  );
}

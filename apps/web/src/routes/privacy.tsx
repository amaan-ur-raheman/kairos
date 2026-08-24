import { createFileRoute } from "@tanstack/react-router";

import { LegalPage, LegalSection } from "@/components/legal-page";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Kairos" },
      {
        name: "description",
        content: "How Kairos collects, uses, and protects account and team availability data.",
      },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: "https://kairos.noctura.dpdns.org/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="August 24, 2026">
      <p>
        Kairos helps teams coordinate availability, focus time, and leave. This policy explains what
        information we collect, why we use it, and the choices available to you.
      </p>
      <LegalSection title="Information we collect">
        <p>
          When you create or use an account, we receive your name, email address, profile image, and
          authentication details from Clerk. We also store the workspace, availability, calendar
          events, working hours, and leave information that you or your team choose to provide.
        </p>
        <p>
          We receive basic technical information needed to operate and protect the service, such as
          browser or device information, log data, and approximate request timing.
        </p>
      </LegalSection>
      <LegalSection title="How we use information">
        <p>
          We use information to provide Kairos, authenticate users, show team availability to the
          appropriate workspace members, keep the service secure, troubleshoot problems, and improve
          reliability. We do not sell personal information.
        </p>
      </LegalSection>
      <LegalSection title="Service providers">
        <p>
          Kairos uses trusted infrastructure providers, including Clerk for authentication, Vercel
          for hosting, and Neon for database infrastructure. These providers process information
          only as needed to provide their services and protect their systems.
        </p>
      </LegalSection>
      <LegalSection title="Your choices">
        <p>
          You may update your profile information in Kairos or request account and data deletion by
          contacting us at shadowmonarch15125@gmail.com. Workspace administrators may control team
          membership and workspace data.
        </p>
      </LegalSection>
      <LegalSection title="Contact">
        <p>Questions about privacy can be sent to shadowmonarch15125@gmail.com.</p>
      </LegalSection>
    </LegalPage>
  );
}

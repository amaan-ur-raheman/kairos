import { SignIn } from "@clerk/tanstack-react-start";
import { createFileRoute } from "@tanstack/react-router";

const clerkAppearance = {
  variables: {
    colorPrimary: "#c2410c",
    colorBackground: "#fffdf9",
    colorText: "#2b2620",
    colorTextSecondary: "#57503f",
    colorInputBackground: "#fffdf9",
    colorInputText: "#2b2620",
    borderRadius: "0.75rem",
    fontFamily: "Inter, sans-serif",
  },
};

export const Route = createFileRoute("/sign-in")({
  head: () => ({
    meta: [
      { title: "Sign in to Kairos" },
      { name: "description", content: "Sign in to see your team's availability in Kairos." },
      { name: "robots", content: "noindex, nofollow, noarchive" },
    ],
  }),
  component: SignInPage,
});

function SignInPage() {
  return (
    <main className="flex min-h-svh">
      <aside
        className="hidden lg:flex flex-col flex-[1.05] text-left relative overflow-hidden"
        style={{
          background:
            "linear-gradient(165deg, var(--ember) 0%, var(--ember-deep) 58%, #7c2d12 100%)",
          color: "#fff7ef",
          padding: "56px 60px",
        }}
      >
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(700px 500px at 85% 110%, rgba(255,235,215,.18), transparent 60%)",
          }}
        />
        <div className="flex items-center gap-[11px] font-serif-display font-semibold text-[20px] relative z-10">
          <span
            className="w-[30px] h-[30px] rounded-full grid place-items-center font-sans text-[13px] font-bold"
            style={{ background: "#fff7ef", color: "var(--ember)" }}
          >
            K
          </span>
          kairos
        </div>
        <div className="my-auto max-w-[26ch] relative z-10">
          <h1
            className="font-serif-display font-semibold leading-[1.12] tracking-[-0.015em]"
            style={{ fontSize: "clamp(34px, 3.6vw, 50px)" }}
          >
            Your team's schedule, <span style={{ color: "#ffd9bd" }}>at a glance.</span>
          </h1>
          <p
            className="mt-[22px] font-serif-display italic text-[16px] leading-[1.6] max-w-[38ch]"
            style={{ color: "#ffefe3" }}
          >
            See who's free, who's focused, and who's out, before you have to ask.
          </p>
        </div>
        <div className="relative z-10 flex gap-[34px] text-[12.5px]" style={{ color: "#ffefe3" }}>
          <span>
            <b className="block font-serif-display text-[19px] font-semibold text-white">8</b>{" "}
            teammates
          </span>
          <span>
            <b className="block font-serif-display text-[19px] font-semibold text-white">4</b>{" "}
            available right now
          </span>
        </div>
      </aside>

      <section className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-paper">
        <div className="w-full max-w-[380px]">
          <div
            className="lg:hidden flex items-center gap-2.5 font-serif-display font-semibold text-xl mb-[34px]"
            style={{ color: "var(--ember)" }}
          >
            <span
              className="w-7 h-7 rounded-full grid place-items-center text-white font-sans text-[11px] font-bold"
              style={{ background: "var(--ember)" }}
            >
              K
            </span>
            kairos
          </div>
          <h2 className="font-serif-display text-[28px] font-semibold tracking-[-0.01em]">
            Welcome back
          </h2>
          <p className="text-[13.5px] mt-1.5 mb-[30px]" style={{ color: "var(--ink-muted)" }}>
            Sign in to see your team's day.
          </p>
          <SignIn signUpUrl="/sign-up" appearance={clerkAppearance} />
        </div>
      </section>
    </main>
  );
}

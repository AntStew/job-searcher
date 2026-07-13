import { buttonPrimary, card } from "@/lib/ui";

export default function AuthCodeErrorPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-4 p-6">
      <div className={card}>
        <h1 className="font-display text-lg font-semibold">Sign-in link expired</h1>
        <p className="mt-2 text-sm text-muted">
          That link is no longer valid. Go back and request a new one.
        </p>
        <a href="/login" className={`${buttonPrimary} mt-4 w-fit`}>
          Back to sign in
        </a>
      </div>
    </main>
  );
}

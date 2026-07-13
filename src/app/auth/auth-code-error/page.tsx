export default function AuthCodeErrorPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="text-xl font-semibold">Sign-in link expired</h1>
      <p className="text-sm text-gray-500">
        That link is no longer valid. Go back and request a new one.
      </p>
      <a href="/login" className="text-sm font-medium underline">
        Back to sign in
      </a>
    </main>
  );
}

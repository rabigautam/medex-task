export default function Home() {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-zinc-900">
        <main className="flex flex-col items-center gap-6 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Welcome to Next.js
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Get started by editing{" "}
            <code className="rounded bg-zinc-200 px-2 py-1 font-mono text-sm font-semibold dark:bg-zinc-800">
              app/page.tsx
            </code>
          </p>
        </main>
      </div>
    );
  }
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-amber-700">
            Get Some Lunch
          </h1>
          <div className="flex gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-stone-700 hover:text-stone-900"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 text-sm font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-2xl text-center">
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-stone-900 mb-6">
            Never argue about lunch again
          </h2>
          <p className="text-lg text-stone-600 mb-8 max-w-lg mx-auto">
            Set your preferences, gather your group, and let the algorithm
            pick the perfect spot. Then vote on the top picks in seconds.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link
              href="/signup"
              className="px-8 py-3 text-base font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors"
            >
              Get started free
            </Link>
          </div>

          <div className="grid sm:grid-cols-3 gap-8 text-left">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-200">
              <div className="text-2xl mb-3">1</div>
              <h3 className="font-semibold mb-2">Set preferences</h3>
              <p className="text-sm text-stone-600">
                Tell us how often you want to visit each restaurant -- daily,
                weekly, monthly, or never.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-200">
              <div className="text-2xl mb-3">2</div>
              <h3 className="font-semibold mb-2">Start a session</h3>
              <p className="text-sm text-stone-600">
                Going to lunch? Start a session and let your coworkers join
                in for today.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-200">
              <div className="text-2xl mb-3">3</div>
              <h3 className="font-semibold mb-2">Vote and go</h3>
              <p className="text-sm text-stone-600">
                Rank the top suggestions, and the winner is decided
                instantly. No more debate.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-stone-200 py-6 text-center text-sm text-stone-500">
        A better way to pick lunch.
      </footer>
    </div>
  );
}

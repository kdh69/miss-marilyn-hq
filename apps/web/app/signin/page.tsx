import { signIn } from "@/auth";
import { familySignIn } from "@/app/actions";
import { familyEnabled } from "@/lib/family";

export default async function SignIn({ searchParams }: { searchParams: Promise<{ family?: string }> }) {
  const wrong = (await searchParams).family === "wrong";
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="glass w-full max-w-sm rounded-3xl p-8 text-center">
        <p className="text-xl font-semibold">Miss Marilyn HQ</p>
        <p className="mt-1 text-sm text-[var(--quiet)]">Clara and Kyle: sign in with your Google account</p>
        <form
          className="mt-6"
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button className="w-full rounded-full bg-orange-500 px-4 py-3 font-semibold text-white">Continue with Google</button>
        </form>
        {familyEnabled() && (
          <form action={familySignIn} className="mt-6 border-t border-black/10 pt-6 text-left">
            <label htmlFor="family-password" className="text-sm font-semibold">Family? Have a look around</label>
            <p className="text-xs text-[var(--quiet)]">View only. Ask Kyle for the family password.</p>
            <div className="mt-2 flex gap-2">
              <input id="family-password" name="password" type="password" required autoComplete="current-password"
                className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-sm outline-none focus:border-orange-400" />
              <button className="rounded-full bg-violet-600 px-4 text-sm font-semibold text-white">Enter</button>
            </div>
            {wrong && <p className="mt-2 text-xs text-rose-700">That's not the family password.</p>}
          </form>
        )}
      </div>
    </div>
  );
}

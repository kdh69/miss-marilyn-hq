import { signIn } from "@/auth";

export default function SignIn() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="glass w-full max-w-sm rounded-3xl p-8 text-center">
        <p className="text-xl font-semibold">Miss Marilyn HQ</p>
        <p className="mt-1 text-sm text-[var(--quiet)]">Sign in with your Google account</p>
        <form
          className="mt-6"
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button className="w-full rounded-full bg-orange-500 px-4 py-3 font-semibold text-white">Continue with Google</button>
        </form>
      </div>
    </div>
  );
}

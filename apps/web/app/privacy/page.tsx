/** Public privacy policy (linked from the Google OAuth consent screen, so no sign-in needed). */
export const metadata = { title: "Privacy — Miss Marilyn HQ" };

export default function Privacy() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="glass w-full max-w-2xl space-y-4 rounded-3xl p-8 text-sm leading-relaxed">
        <p className="text-xl font-semibold">Miss Marilyn HQ — Privacy</p>
        <p>
          Miss Marilyn HQ is a private control panel used by a small family business to make and sell
          children's books. It is not a public service; only people the owner has added can sign in.
        </p>
        <p className="font-semibold">What we use from your Google account</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Your name and email address, to check that you are allowed into the panel.</li>
          <li>
            For the business owner's account only: access to Google Drive, to save backups and uploaded
            photos into the business's own Drive folder.
          </li>
        </ul>
        <p className="font-semibold">What we do with it</p>
        <p>
          The data stays in the business's own Google Sheet and Drive. We don't sell it, share it with
          anyone else, use it for advertising, or use it to train AI models.
        </p>
        <p className="font-semibold">Removing access</p>
        <p>
          You can remove the app's access at any time from your Google Account under Security → Third-party
          apps & services. Questions: write to the support email shown on the Google sign-in screen.
        </p>
      </div>
    </div>
  );
}

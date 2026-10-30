import type { MetadataRoute } from "next";

/** Lets Clara add the panel to her home screen; it then opens full screen like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Miss Marilyn HQ",
    short_name: "Miss Marilyn",
    description: "Write the books, see where everything is.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#f97316",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

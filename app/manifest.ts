import type { MetadataRoute } from "next";

/* Makes TickList installable: "Add to Home screen" on a phone opens it full screen, like an app */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TickList",
    short_name: "TickList",
    description: "One shopping and chores list for the whole house.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f3ea",
    theme_color: "#2b7349",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

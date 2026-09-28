import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "School OS · Dein Raum zum Lernen",
    short_name: "School OS",
    description:
      "Dein Schulalltag. Ein Workspace. Notizen, Canvas, Aufgaben und KI.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fafbf9",
    theme_color: "#fafbf9",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AddonBUILD — Minecraft Add-On Maker",
  description:
    "AddonBUILD 2.0 — create Minecraft Bedrock resource packs and behavior packs in your browser. Edit real vanilla textures, build behaviors with forms, and export .zip or .mcpack add-ons.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

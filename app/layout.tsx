import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AddonBUILD — Minecraft Add-On Maker",
  description:
    "Create Minecraft Bedrock resource packs and behavior packs right in your browser. Edit every texture, write JSON, and export .zip add-ons.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

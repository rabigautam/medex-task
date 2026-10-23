import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "MedEx — Healthcare Service Explorer",
  description: "Explore and compare healthcare services across providers."
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
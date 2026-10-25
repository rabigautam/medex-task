import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "MedEx | Appointment booking",
  description: "Choose a specialist and appointment time across time zones."
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

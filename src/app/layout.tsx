import type { Metadata } from "next";
import "./globals.css";
import { Header, Footer } from "@/components/chrome";
export const metadata: Metadata = { title: "KHOJO — Find skilled workers nearby", description: "Book trusted local masons, electricians, plumbers and more." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><Header />{children}<Footer /></body></html>; }

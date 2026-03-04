import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title:       "Eco-Swap — Give Your Items a Second Life",
  description: "Swap, donate, or sell items you no longer need. Earn eco points, reduce waste, and join a sustainable community.",
  keywords:    "swap, donate, eco, sustainability, second-hand, trade, green",
  openGraph: {
    title:       "Eco-Swap — Give Your Items a Second Life",
    description: "Swap, donate, or sell items you no longer need. Earn eco points and help the planet.",
    type:        "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
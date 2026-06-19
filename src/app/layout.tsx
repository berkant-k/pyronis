import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { cookies } from "next/headers";
import { Toaster } from "sonner";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import appConfig from "@/lib/config.json";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Pyronis EMR",
  description: "Pyronis Electronic Medical Records",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const isAuthenticated = !!cookieStore.get(appConfig.auth.storageKey)?.value;

  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className={isAuthenticated ? "flex h-full print:block" : "h-full"}>
        {isAuthenticated && <Sidebar />}
        {isAuthenticated ? (
          <div className="flex flex-1 flex-col overflow-hidden print:overflow-visible print:h-auto">
            <Header />
            <main className="relative flex-1 overflow-auto bg-background p-6 print:overflow-visible print:p-0">{children}</main>
          </div>
        ) : (
          children
        )}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}

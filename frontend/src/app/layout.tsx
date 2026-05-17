import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EduAgent — Gestión Pedagógica Inteligente",
  description:
    "Ecosistema de gestión pedagógica con agentes RAG para la planificación curricular multigrado, generación de material didáctico y evaluación alineada con los estándares del MEN.",
  keywords: ["educación", "pedagogía", "RAG", "Escuela Nueva", "MEN", "Colombia", "multigrado"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} dark h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <TooltipProvider>
          {children}
        </TooltipProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}

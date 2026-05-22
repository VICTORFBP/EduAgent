"use client";

import { usePathname } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Menu,
  LogOut,
  User,
  FolderOpen,
  GraduationCap,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/planeacion": "Planeación Curricular",
  "/planeacion/nueva": "Nueva Planeación",
  "/evaluacion": "Evaluación",
  "/evaluacion/nueva": "Nueva Evaluación",
  "/documentos": "Documentos",
  "/documentos/cargar": "Cargar Documento",
  "/consulta": "Consulta RAG",
  "/estudiantes": "Estudiantes",
};

function getPageTitle(pathname: string): string {
  // Check exact match first
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  // Check prefix matches for dynamic routes
  if (pathname.startsWith("/planeacion/")) return "Detalle de Planeación";
  if (pathname.startsWith("/estudiantes/")) return "Perfil del Estudiante";
  return "EduAgent";
}

export function Header() {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);
  const [docente, setDocente] = useState<{ nombre: string; grados_asignados: number[] } | null>(null);

  useEffect(() => {
    async function fetchUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("docentes").select("*").eq("id", user.id).single();
        if (data) {
          setDocente(data);
        } else {
          setDocente({ nombre: user.email || "Docente", grados_asignados: [] });
        }
      }
    }
    fetchUser();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const initials = (docente?.nombre || "...")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-border bg-background/80 backdrop-blur-xl flex items-center justify-between px-4 lg:px-6">
      {/* Left: Mobile menu + Title */}
      <div className="flex items-center gap-3">
        {/* Logo and Mobile Title */}
        <div className="flex items-center gap-3 lg:hidden">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl gradient-primary">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
        </div>

        <h1 className="text-lg font-semibold tracking-tight">{pageTitle}</h1>
      </div>

      {/* Right: User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium leading-none">{docente?.nombre || "Cargando..."}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {docente?.grados_asignados?.length ? `Grados ${docente.grados_asignados.join(", ")}` : "Cargando..."}
            </p>
          </div>
          <Avatar className="w-9 h-9 border-2 border-primary/30">
            <AvatarFallback className="bg-primary/15 text-primary text-sm font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem>
            <User className="w-4 h-4 mr-2" />
            Mi perfil
          </DropdownMenuItem>
          <DropdownMenuItem>
            <FolderOpen className="w-4 h-4 mr-2" />
            Mis documentos
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive cursor-pointer">
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

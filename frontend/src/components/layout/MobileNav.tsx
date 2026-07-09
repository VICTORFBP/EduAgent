"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  ClipboardCheck,
  Bot,
  Users,
  Shield,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const MOBILE_NAV_ITEMS = [
  { label: "Inicio", href: "/dashboard", icon: LayoutDashboard },
  { label: "Planear", href: "/planeacion", icon: BookOpen },
  { label: "Evaluar", href: "/evaluacion", icon: ClipboardCheck },
  { label: "Agente", href: "/consulta", icon: Bot },
  { label: "Docs", href: "/documentos", icon: FolderOpen },
  { label: "Alumnos", href: "/estudiantes", icon: Users },
];

export function MobileNav() {
  const pathname = usePathname();
  const [rol, setRol] = useState<string>("docente");

  useEffect(() => {
    async function checkRole() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("docentes").select("rol").eq("id", user.id).single();
        if (data && data.rol) setRol(data.rol);
      }
    }
    checkRole();
  }, []);

  let items = [...MOBILE_NAV_ITEMS];
  if (rol === "admin") {
    // Para administradores, ocultamos las vistas específicas de profesores
    items = items.filter(item => !["Alumnos", "Planear", "Evaluar"].includes(item.label));
    items.push({ label: "Admin", href: "/admin", icon: Shield });
  }

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border bottom-nav overflow-x-auto no-scrollbar">
      <div className="flex items-center px-2 py-1 w-max min-w-full justify-around space-x-2">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-all duration-200 min-w-[64px]",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <div className={cn(
                "relative p-1.5 rounded-xl transition-all duration-200",
                isActive && "bg-primary/15"
              )}>
                <item.icon className="w-5 h-5" />
                {isActive && (
                  <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
              </div>
              <span className={cn(
                "text-[10px] font-medium transition-all whitespace-nowrap",
                isActive && "text-primary"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

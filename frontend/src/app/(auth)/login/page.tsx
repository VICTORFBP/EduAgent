"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { GraduationCap, Loader2, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      const mensajes: Record<string, string> = {
        "Invalid login credentials": "Correo o contraseña incorrectos.",
        "Email not confirmed": "Debes confirmar tu correo antes de ingresar.",
        "Too many requests": "Demasiados intentos. Espera unos minutos.",
      };
      setError(mensajes[authError.message] ?? authError.message);
      setIsLoading(false);
      return;
    }

    // Refrescar el servidor para que el proxy SSR detecte la sesión
    router.refresh();
    router.push("/dashboard");
  };

  return (
    <div className="animate-slide-up">
      <Card className="glass-card border-white/10">
        <CardHeader className="text-center pb-2 pt-8">
          {/* Logo */}
          <div className="mx-auto mb-4 flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary animate-pulse-glow">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">EduAgent</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestión Pedagógica Inteligente
          </p>
          <p className="text-xs text-muted-foreground/70 mt-0.5">
            Sede Escuela Rural Mixta El Crucero
          </p>
        </CardHeader>
        <CardContent className="px-6 pb-8 pt-4">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Correo electrónico
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="docente@elcrucero.edu.co"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 bg-white/5 border-white/10 focus:border-primary focus:ring-primary/20"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Contraseña
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 bg-white/5 border-white/10 focus:border-primary focus:ring-primary/20 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg animate-fade-in">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 gradient-primary text-white font-medium hover:opacity-90 transition-opacity"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Ingresando...
                </>
              ) : (
                "Ingresar"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground/60">
              Corporación Universitaria Comfacauca · 2026
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

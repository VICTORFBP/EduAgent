"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, UserPlus, Users, GraduationCap, Mail, Key } from "lucide-react";
import { useState, useEffect } from "react";

export default function AdminPage() {
  const [docentes, setDocentes] = useState<any[]>([]);
  const [estudiantes, setEstudiantes] = useState<any[]>([]);
  
  // Forms
  const [docenteForm, setDocenteForm] = useState({ nombre: "", email: "", password: "", grados_asignados: [] as number[] });
  const [estudianteForm, setEstudianteForm] = useState({ nombre: "", grado: 1 });
  
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    // Note: This points to FastAPI
    try {
      const dRes = await fetch("http://localhost:8000/admin/docentes", {
        headers: { Authorization: `Bearer ${localStorage.getItem("sb-access-token")}` }
      });
      if (dRes.ok) {
        const dData = await dRes.json();
        setDocentes(dData);
      }
      
      const eRes = await fetch("http://localhost:8000/admin/estudiantes", {
        headers: { Authorization: `Bearer ${localStorage.getItem("sb-access-token")}` }
      });
      if (eRes.ok) {
        const eData = await eRes.json();
        setEstudiantes(eData);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    // We need to fetch the token from Supabase since we use proxy or standard auth
    const init = async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        localStorage.setItem("sb-access-token", session.access_token);
        fetchData();
      }
    };
    init();
  }, []);

  const handleCreateDocente = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/admin/docentes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("sb-access-token")}`
        },
        body: JSON.stringify(docenteForm)
      });
      if (res.ok) {
        alert("Docente creado exitosamente");
        setDocenteForm({ nombre: "", email: "", password: "", grados_asignados: [] });
        fetchData();
      } else {
        const err = await res.json();
        alert(`Error: ${err.detail}`);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleCreateEstudiante = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/admin/estudiantes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("sb-access-token")}`
        },
        body: JSON.stringify(estudianteForm)
      });
      if (res.ok) {
        alert("Estudiante creado exitosamente");
        setEstudianteForm({ nombre: "", grado: 1 });
        fetchData();
      } else {
        const err = await res.json();
        alert(`Error: ${err.detail}`);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const toggleGrado = (grado: number) => {
    setDocenteForm(prev => {
      const current = prev.grados_asignados;
      if (current.includes(grado)) {
        return { ...prev, grados_asignados: current.filter(g => g !== grado) };
      } else {
        return { ...prev, grados_asignados: [...current, grado].sort() };
      }
    });
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6 animate-slide-up">
        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
          <Shield className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Panel de Administración</h2>
          <p className="text-muted-foreground text-sm">Gestiona docentes, grados y estudiantes del sistema</p>
        </div>
      </div>

      <Tabs defaultValue="docentes" className="animate-slide-up delay-100">
        <TabsList className="mb-4">
          <TabsTrigger value="docentes">Gestión de Docentes</TabsTrigger>
          <TabsTrigger value="estudiantes">Gestión de Estudiantes</TabsTrigger>
        </TabsList>

        {/* DOCENTES TAB */}
        <TabsContent value="docentes" className="space-y-6">
          <Card className="glass-card border-white/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" /> Nuevo Docente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateDocente} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nombre Completo</label>
                    <Input 
                      placeholder="Ej. Juan Pérez" 
                      required 
                      value={docenteForm.nombre}
                      onChange={e => setDocenteForm({...docenteForm, nombre: e.target.value})}
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Correo Electrónico</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input 
                        type="email" 
                        placeholder="juan@eduagent.com" 
                        required 
                        value={docenteForm.email}
                        onChange={e => setDocenteForm({...docenteForm, email: e.target.value})}
                        className="pl-10 bg-white/5 border-white/10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">Contraseña Inicial</label>
                    <div className="relative">
                      <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input 
                        type="password" 
                        placeholder="Contraseña segura" 
                        required 
                        value={docenteForm.password}
                        onChange={e => setDocenteForm({...docenteForm, password: e.target.value})}
                        className="pl-10 bg-white/5 border-white/10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">Grados Asignados</label>
                    <div className="flex gap-2 flex-wrap">
                      {[1, 2, 3, 4, 5].map(grado => (
                        <button
                          type="button"
                          key={grado}
                          onClick={() => toggleGrado(grado)}
                          className={`px-4 py-2 rounded-xl text-sm transition-all border ${
                            docenteForm.grados_asignados.includes(grado) 
                            ? "bg-primary text-primary-foreground border-primary" 
                            : "bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10"
                          }`}
                        >
                          Grado {grado}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <Button type="submit" disabled={loading} className="w-full md:w-auto mt-4">
                  {loading ? "Creando..." : "Crear Docente"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="glass-card border-white/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" /> Docentes Actuales ({docentes.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {docentes.map(d => (
                  <div key={d.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                    <div>
                      <p className="font-medium text-sm flex items-center gap-2">
                        {d.nombre}
                        {d.rol === 'admin' && <Badge variant="secondary" className="bg-amber-500/20 text-amber-500 hover:bg-amber-500/20">Admin</Badge>}
                      </p>
                      <p className="text-xs text-muted-foreground">{d.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground mb-1">Grados Asignados</p>
                      <div className="flex gap-1 justify-end">
                        {d.grados_asignados?.map((g: number) => (
                          <Badge key={g} variant="outline" className="border-primary/30 text-primary">{g}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ESTUDIANTES TAB */}
        <TabsContent value="estudiantes" className="space-y-6">
          <Card className="glass-card border-white/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary" /> Nuevo Estudiante
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateEstudiante} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nombre del Estudiante</label>
                    <Input 
                      placeholder="Ej. Ana García" 
                      required 
                      value={estudianteForm.nombre}
                      onChange={e => setEstudianteForm({...estudianteForm, nombre: e.target.value})}
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Grado</label>
                    <select 
                      className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      value={estudianteForm.grado}
                      onChange={e => setEstudianteForm({...estudianteForm, grado: parseInt(e.target.value)})}
                    >
                      {[1, 2, 3, 4, 5].map(g => (
                        <option key={g} value={g} className="bg-background text-foreground">Grado {g}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <Button type="submit" disabled={loading} className="w-full md:w-auto mt-4">
                  {loading ? "Registrando..." : "Registrar Estudiante"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="glass-card border-white/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" /> Estudiantes Actuales ({estudiantes.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {estudiantes.map(e => (
                  <div key={e.id} className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3">
                     <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-sky-500/20 flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">
                          {e.nombre.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{e.nombre}</p>
                        <Badge variant="secondary" className="text-[10px] border-0 mt-0.5">
                          Grado {e.grado}
                        </Badge>
                      </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

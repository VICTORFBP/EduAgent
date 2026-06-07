"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield, UserPlus, Users, GraduationCap, Mail, Key,
  MapPin, PlusCircle, Trash2, ChevronDown, ChevronUp,
  Building2, Loader2, BarChart2, ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Sede, Docente, Estudiante } from "@/lib/types";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function apiFetch(path: string, token: string, opts: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Error en el servidor");
  }
  return res.json();
}

// ─── Sede card with collapsible docente list ─────────────────
function SedeCard({
  sede,
  docentes,
  onDelete,
}: {
  sede: Sede;
  docentes: Docente[];
  onDelete?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const docentesDeSede = docentes.filter((d) => d.sede_id === sede.id);
  return (
    <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Building2 className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">{sede.nombre}</p>
            <p className="text-xs text-muted-foreground">
              {sede.municipio || "Sin municipio"} · {docentesDeSede.length} docente(s)
            </p>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </div>
      {open && (
        <div className="pt-2 space-y-2 border-t border-white/5">
          {docentesDeSede.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">
              Sin docentes asignados
            </p>
          ) : (
            docentesDeSede.map((d) => (
              <div key={d.id} className="flex items-center justify-between text-sm px-2 py-1.5 rounded-lg bg-white/5">
                <span className="font-medium">{d.nombre}</span>
                <div className="flex gap-1">
                  {d.grados_asignados?.map((g) => (
                    <Badge key={g} variant="outline" className="border-primary/30 text-primary text-[10px] px-1.5">
                      G{g}
                    </Badge>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main admin page ──────────────────────────────────────────
export default function AdminPage() {
  const [token, setToken] = useState("");
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [loading, setLoading] = useState(false);

  // Forms
  const [sedeForm, setSedeForm] = useState({ nombre: "", municipio: "", descripcion: "" });
  const [docenteForm, setDocenteForm] = useState({
    nombre: "", email: "", password: "", sede_id: "", grados_asignados: [] as number[],
  });
  const [estudianteForm, setEstudianteForm] = useState({
    nombre: "", grado: 1, sede_id: "", docente_id: "",
  });

  // Fetch all data
  const fetchAll = useCallback(async (tk: string) => {
    try {
      const [s, d, e] = await Promise.all([
        apiFetch("/admin/sedes", tk),
        apiFetch("/admin/docentes", tk),
        apiFetch("/admin/estudiantes", tk),
      ]);
      setSedes(s);
      setDocentes(d);
      setEstudiantes(e);
    } catch (err) {
      toast.error("Error cargando datos");
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
        setToken(session.access_token);
        fetchAll(session.access_token);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.access_token) setToken(session.access_token);
    });
    return () => subscription.unsubscribe();
  }, [fetchAll]);

  // Sede: filter docentes by selected sede for estudiante form
  const docentesBySede = docentes.filter(
    (d) => d.sede_id === estudianteForm.sede_id && d.rol !== "admin"
  );

  // ── Create sede ──
  const handleCreateSede = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch("/admin/sedes", token, {
        method: "POST",
        body: JSON.stringify({ ...sedeForm }),
      });
      toast.success("Sede creada exitosamente");
      setSedeForm({ nombre: "", municipio: "", descripcion: "" });
      fetchAll(token);
    } catch (err: any) {
      toast.error(err.message);
    }
    setLoading(false);
  };

  // ── Create docente ──
  const handleCreateDocente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docenteForm.sede_id) { toast.error("Selecciona una sede"); return; }
    if (docenteForm.grados_asignados.length === 0) { toast.error("Selecciona al menos un grado"); return; }
    setLoading(true);
    try {
      await apiFetch("/admin/docentes", token, {
        method: "POST",
        body: JSON.stringify(docenteForm),
      });
      toast.success("Docente creado exitosamente");
      setDocenteForm({ nombre: "", email: "", password: "", sede_id: "", grados_asignados: [] });
      fetchAll(token);
    } catch (err: any) {
      toast.error(err.message);
    }
    setLoading(false);
  };

  // ── Create estudiante ──
  const handleCreateEstudiante = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!estudianteForm.sede_id) { toast.error("Selecciona una sede"); return; }
    if (!estudianteForm.docente_id) { toast.error("Selecciona un docente"); return; }
    setLoading(true);
    try {
      await apiFetch("/admin/estudiantes", token, {
        method: "POST",
        body: JSON.stringify(estudianteForm),
      });
      toast.success("Estudiante registrado");
      setEstudianteForm({ nombre: "", grado: 1, sede_id: "", docente_id: "" });
      fetchAll(token);
    } catch (err: any) {
      toast.error(err.message);
    }
    setLoading(false);
  };

  // ── Delete helpers ──
  const deleteDocente = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar a ${nombre}? Esta acción no se puede deshacer.`)) return;
    try {
      await apiFetch(`/admin/docentes/${id}`, token, { method: "DELETE" });
      toast.success("Docente eliminado");
      fetchAll(token);
    } catch (err: any) { toast.error(err.message); }
  };

  const deleteEstudiante = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar a ${nombre}?`)) return;
    try {
      await apiFetch(`/admin/estudiantes/${id}`, token, { method: "DELETE" });
      toast.success("Estudiante eliminado");
      fetchAll(token);
    } catch (err: any) { toast.error(err.message); }
  };

  const toggleGrado = (g: number) => {
    setDocenteForm((prev) => ({
      ...prev,
      grados_asignados: prev.grados_asignados.includes(g)
        ? prev.grados_asignados.filter((x) => x !== g)
        : [...prev.grados_asignados, g].sort(),
    }));
  };

  const selectStyle = "flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent";

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 animate-slide-up">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Panel de Administración</h2>
            <p className="text-muted-foreground text-sm">
              Gestiona sedes, docentes y estudiantes de la institución
            </p>
          </div>
        </div>
        <Link href="/admin/metricas">
          <Button variant="outline" size="sm" className="gap-2 border-violet-500/30 text-violet-400 hover:bg-violet-500/10 hover:text-violet-300">
            <BarChart2 className="w-4 h-4" />
            Métricas del Piloto
            <ArrowRight className="w-3 h-3" />
          </Button>
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-slide-up delay-100">
        {[
          { label: "Sedes", value: sedes.length, icon: Building2, color: "text-primary" },
          { label: "Docentes", value: docentes.filter(d => d.rol !== "admin").length, icon: Users, color: "text-emerald-500" },
          { label: "Estudiantes", value: estudiantes.length, icon: GraduationCap, color: "text-sky-500" },
        ].map((s) => (
          <Card key={s.label} className="glass-card border-white/5">
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`w-6 h-6 ${s.color}`} />
              <div>
                <p className="text-xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
        <Link href="/admin/metricas" className="block">
          <Card className="glass-card border-violet-500/20 hover:border-violet-500/40 transition-all duration-300 hover:-translate-y-0.5 cursor-pointer group h-full">
            <CardContent className="p-4 flex items-center gap-3 h-full">
              <BarChart2 className="w-6 h-6 text-violet-400 group-hover:text-violet-300 transition-colors" />
              <div>
                <p className="text-sm font-semibold text-violet-400 group-hover:text-violet-300">Métricas</p>
                <p className="text-xs text-muted-foreground">Ver piloto</p>
              </div>
              <ArrowRight className="w-4 h-4 text-violet-400/50 group-hover:text-violet-300 group-hover:translate-x-1 transition-all ml-auto" />
            </CardContent>
          </Card>
        </Link>
      </div>

      <Tabs defaultValue="sedes" className="animate-slide-up delay-200">
        <TabsList className="mb-4">
          <TabsTrigger value="sedes">🏫 Sedes</TabsTrigger>
          <TabsTrigger value="docentes">👤 Docentes</TabsTrigger>
          <TabsTrigger value="estudiantes">🎓 Estudiantes</TabsTrigger>
        </TabsList>

        {/* ── SEDES TAB ── */}
        <TabsContent value="sedes" className="space-y-4">
          <Card className="glass-card border-white/5">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-primary" /> Nueva Sede
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateSede} className="space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Nombre de la sede *</label>
                    <Input placeholder="Ej. El Crucero" required value={sedeForm.nombre}
                      onChange={(e) => setSedeForm({ ...sedeForm, nombre: e.target.value })}
                      className="bg-white/5 border-white/10" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Municipio</label>
                    <Input placeholder="Ej. Patía" value={sedeForm.municipio}
                      onChange={(e) => setSedeForm({ ...sedeForm, municipio: e.target.value })}
                      className="bg-white/5 border-white/10" />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-sm font-medium">Descripción</label>
                    <Input placeholder="Escuela Rural Mixta..." value={sedeForm.descripcion}
                      onChange={(e) => setSedeForm({ ...sedeForm, descripcion: e.target.value })}
                      className="bg-white/5 border-white/10" />
                  </div>
                </div>
                <Button type="submit" disabled={loading} size="sm">
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PlusCircle className="w-4 h-4 mr-2" />}
                  Crear Sede
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {sedes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No hay sedes registradas.</p>
            ) : (
              sedes.map((s) => (
                <SedeCard key={s.id} sede={s} docentes={docentes} />
              ))
            )}
          </div>
        </TabsContent>

        {/* ── DOCENTES TAB ── */}
        <TabsContent value="docentes" className="space-y-4">
          <Card className="glass-card border-white/5">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-primary" /> Nuevo Docente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateDocente} className="space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Nombre completo *</label>
                    <Input placeholder="Ej. Juan Pérez" required value={docenteForm.nombre}
                      onChange={(e) => setDocenteForm({ ...docenteForm, nombre: e.target.value })}
                      className="bg-white/5 border-white/10" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Correo electrónico *</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input type="email" placeholder="juan@escuela.edu.co" required value={docenteForm.email}
                        onChange={(e) => setDocenteForm({ ...docenteForm, email: e.target.value })}
                        className="pl-10 bg-white/5 border-white/10" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Contraseña inicial *</label>
                    <div className="relative">
                      <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input type="password" placeholder="Contraseña segura" required value={docenteForm.password}
                        onChange={(e) => setDocenteForm({ ...docenteForm, password: e.target.value })}
                        className="pl-10 bg-white/5 border-white/10" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Sede *</label>
                    <select className={selectStyle} value={docenteForm.sede_id}
                      onChange={(e) => setDocenteForm({ ...docenteForm, sede_id: e.target.value })}>
                      <option value="" className="bg-background">Selecciona una sede</option>
                      {sedes.map((s) => (
                        <option key={s.id} value={s.id} className="bg-background">{s.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-sm font-medium">Grados asignados *</label>
                    <div className="flex gap-2 flex-wrap">
                      {[1, 2, 3, 4, 5].map((g) => (
                        <button key={g} type="button" onClick={() => toggleGrado(g)}
                          className={`px-4 py-2 rounded-xl text-sm transition-all border ${docenteForm.grados_asignados.includes(g)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10"}`}>
                          Grado {g}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <Button type="submit" disabled={loading} size="sm">
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                  Crear Docente
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Docentes list grouped by sede */}
          <div className="space-y-4">
            {sedes.map((sede) => {
              const docsEnSede = docentes.filter((d) => d.sede_id === sede.id && d.rol !== "admin");
              return (
                <Card key={sede.id} className="glass-card border-white/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      {sede.nombre}
                      <Badge variant="secondary" className="ml-auto">{docsEnSede.length} docente(s)</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {docsEnSede.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Sin docentes asignados.</p>
                    ) : (
                      <div className="space-y-2">
                        {docsEnSede.map((d) => (
                          <div key={d.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                            <div>
                              <p className="font-medium text-sm">{d.nombre}</p>
                              <p className="text-xs text-muted-foreground">{(d as any).email}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex gap-1">
                                {d.grados_asignados?.map((g) => (
                                  <Badge key={g} variant="outline" className="border-primary/30 text-primary text-[10px]">{g}</Badge>
                                ))}
                              </div>
                              <button onClick={() => deleteDocente(d.id, d.nombre)}
                                className="p-1.5 rounded-lg hover:bg-destructive/20 hover:text-destructive transition-colors text-muted-foreground">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ── ESTUDIANTES TAB ── */}
        <TabsContent value="estudiantes" className="space-y-4">
          <Card className="glass-card border-white/5">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-primary" /> Nuevo Estudiante
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateEstudiante} className="space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Nombre del estudiante *</label>
                    <Input placeholder="Ej. Ana García" required value={estudianteForm.nombre}
                      onChange={(e) => setEstudianteForm({ ...estudianteForm, nombre: e.target.value })}
                      className="bg-white/5 border-white/10" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Grado *</label>
                    <select className={selectStyle} value={estudianteForm.grado}
                      onChange={(e) => setEstudianteForm({ ...estudianteForm, grado: parseInt(e.target.value) })}>
                      {[1, 2, 3, 4, 5].map((g) => (
                        <option key={g} value={g} className="bg-background">Grado {g}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Sede *</label>
                    <select className={selectStyle} value={estudianteForm.sede_id}
                      onChange={(e) => setEstudianteForm({ ...estudianteForm, sede_id: e.target.value, docente_id: "" })}>
                      <option value="" className="bg-background">Selecciona una sede</option>
                      {sedes.map((s) => (
                        <option key={s.id} value={s.id} className="bg-background">{s.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Docente asignado *</label>
                    <select className={selectStyle} value={estudianteForm.docente_id}
                      onChange={(e) => setEstudianteForm({ ...estudianteForm, docente_id: e.target.value })}
                      disabled={!estudianteForm.sede_id}>
                      <option value="" className="bg-background">
                        {estudianteForm.sede_id ? "Selecciona docente" : "Primero selecciona una sede"}
                      </option>
                      {docentesBySede.map((d) => (
                        <option key={d.id} value={d.id} className="bg-background">
                          {d.nombre} (G{d.grados_asignados?.join(", ")})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <Button type="submit" disabled={loading} size="sm">
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <GraduationCap className="w-4 h-4 mr-2" />}
                  Registrar Estudiante
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Estudiantes grouped by sede */}
          {sedes.map((sede) => {
            const estsEnSede = estudiantes.filter((e) => e.sede_id === sede.id);
            return (
              <Card key={sede.id} className="glass-card border-white/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    {sede.nombre}
                    <Badge variant="secondary" className="ml-auto">{estsEnSede.length} estudiante(s)</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {estsEnSede.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Sin estudiantes registrados.</p>
                  ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {estsEnSede.map((est) => {
                        const docente = docentes.find((d) => d.id === est.docente_id);
                        return (
                          <div key={est.id} className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/20 to-sky-500/20 flex items-center justify-center shrink-0">
                                <span className="text-[10px] font-bold text-primary">
                                  {est.nombre.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{est.nombre}</p>
                                <p className="text-[10px] text-muted-foreground truncate">
                                  G{est.grado} · {docente?.nombre || "Sin docente"}
                                </p>
                              </div>
                            </div>
                            <button onClick={() => deleteEstudiante(est.id, est.nombre)}
                              className="p-1 rounded-lg hover:bg-destructive/20 hover:text-destructive transition-colors text-muted-foreground shrink-0">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}

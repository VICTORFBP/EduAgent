"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Send, Bot, User, ChevronDown, ChevronUp,
  Sparkles, AlertCircle, RefreshCw, Plus, Trash2,
  MessageSquare, Menu, X, Wrench, CheckCircle2,
  Loader2, BookOpen, BarChart3, Users, FileText,
  ClipboardList,
} from "lucide-react";
import type { ChatMessage, AgentToolCall } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

/* ─── Constants ──────────────────────────────────────────────── */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const MAX_SESSIONS = 20;
const MAX_MESSAGES_PER_SESSION = 60;

const TOOL_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  consultar_documentos: { label: "Consultando documentos pedagógicos", icon: BookOpen, color: "text-blue-400" },
  generar_planeacion:   { label: "Generando planeación curricular",   icon: ClipboardList, color: "text-emerald-400" },
  listar_planeaciones:  { label: "Buscando planeaciones",             icon: FileText, color: "text-amber-400" },
  listar_estudiantes:   { label: "Consultando estudiantes",           icon: Users, color: "text-purple-400" },
  ver_estadisticas:     { label: "Obteniendo estadísticas",           icon: BarChart3, color: "text-pink-400" },
};

const SUGGESTIONS = [
  "¿Qué es la escuela nueva y cómo aplica en el aula?",
  "Genera una planeación de Matemáticas para grado 3 sobre fracciones",
  "Muéstrame mis planeaciones recientes",
  "¿Cuántos estudiantes tengo registrados?",
];

/* ─── Types ──────────────────────────────────────────────────── */

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

/* ─── Storage helpers ────────────────────────────────────────── */

function storageKey(uid: string) { return `eduagent_agent_sessions_${uid}`; }

function loadSessions(uid: string): ChatSession[] {
  if (typeof window === "undefined" || !uid) return [];
  try {
    const raw = localStorage.getItem(storageKey(uid));
    if (!raw) return [];
    const p = JSON.parse(raw) as ChatSession[];
    return Array.isArray(p) ? p : [];
  } catch { return []; }
}

function saveSessions(uid: string, sessions: ChatSession[]) {
  if (typeof window === "undefined" || !uid) return;
  try {
    const trimmed = sessions.slice(-MAX_SESSIONS).map(s => ({
      ...s, messages: s.messages.slice(-MAX_MESSAGES_PER_SESSION),
    }));
    localStorage.setItem(storageKey(uid), JSON.stringify(trimmed));
  } catch { /* quota */ }
}

function newSession(): ChatSession {
  return {
    id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: "Nueva conversación",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [],
  };
}

function autoTitle(msg: string) {
  return msg.length > 45 ? msg.slice(0, 42) + "…" : msg;
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Ahora";
  if (mins < 60) return `Hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs}h`;
  return `Hace ${Math.floor(hrs / 24)}d`;
}

/* ─── Sub-components ─────────────────────────────────────────── */

function ToolCallCard({ tc }: { tc: AgentToolCall }) {
  const [expanded, setExpanded] = useState(false);
  const meta = TOOL_LABELS[tc.name];
  const Icon = meta?.icon ?? Wrench;
  const colorClass = meta?.color ?? "text-primary";

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden text-xs">
      <button
        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 transition-colors text-left"
        onClick={() => setExpanded(!expanded)}
      >
        {tc.status === "running" ? (
          <Loader2 className={`w-3.5 h-3.5 ${colorClass} animate-spin shrink-0`} />
        ) : tc.status === "completed" ? (
          <CheckCircle2 className={`w-3.5 h-3.5 ${colorClass} shrink-0`} />
        ) : (
          <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
        )}
        <span className={`font-medium ${colorClass}`}>
          {meta?.label ?? tc.name}
        </span>
        <span className="ml-auto text-muted-foreground/50">
          {tc.status === "running" ? "ejecutando…" : "completado"}
        </span>
        {tc.result && (expanded ? <ChevronUp className="w-3 h-3 text-muted-foreground/50" /> : <ChevronDown className="w-3 h-3 text-muted-foreground/50" />)}
      </button>
      {expanded && tc.result && (
        <div className="px-3 pb-3 pt-1 border-t border-white/10 text-muted-foreground leading-relaxed whitespace-pre-line">
          {tc.result.slice(0, 400)}{tc.result.length > 400 ? "…" : ""}
        </div>
      )}
    </div>
  );
}

function FormattedContent({ content }: { content: string }) {
  // Simple inline markdown: **bold**, *italic*, `code`, numbered/bullet lists
  const lines = content.split("\n");
  return (
    <div className="space-y-1 leading-relaxed">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;

        // Headers
        if (line.startsWith("### ")) return <p key={i} className="font-semibold text-sm mt-2">{renderInline(line.slice(4))}</p>;
        if (line.startsWith("## "))  return <p key={i} className="font-bold mt-2">{renderInline(line.slice(3))}</p>;
        if (line.startsWith("# "))   return <p key={i} className="font-bold text-base mt-2">{renderInline(line.slice(2))}</p>;

        // List items
        if (/^\d+\.\s/.test(line)) return <p key={i} className="ml-2">{renderInline(line)}</p>;
        if (line.startsWith("- ") || line.startsWith("• ")) {
          return <p key={i} className="ml-2 flex gap-1.5"><span className="text-primary mt-0.5 shrink-0">•</span><span>{renderInline(line.slice(2))}</span></p>;
        }

        return <p key={i}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={i}>{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={i} className="bg-white/10 px-1 rounded text-[11px] font-mono">{part.slice(1, -1)}</code>;
    return <span key={i}>{part}</span>;
  });
}

function ThinkingBubble({ elapsed }: { elapsed: number }) {
  const steps = ["Analizando tu mensaje…", "Decidiendo qué herramientas usar…", "Consultando fuentes…", "Redactando respuesta…"];
  const step = steps[Math.min(Math.floor(elapsed / 6), steps.length - 1)];
  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center gradient-primary">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="chat-bubble-assistant p-4 space-y-2 max-w-xs">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map(i => (
            <span key={i} className="w-2 h-2 rounded-full bg-primary/70"
              style={{ animation: "bounce 1.4s ease-in-out infinite", animationDelay: `${i * 0.22}s` }} />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{step}</p>
        {elapsed > 5 && <p className="text-[10px] text-muted-foreground/50">{elapsed}s · Puede tardar hasta 60s si genera planeación</p>}
      </div>
    </div>
  );
}

/* ─── Sessions sidebar ───────────────────────────────────────── */

function SessionsSidebar({ sessions, activeId, onSelect, onNew, onDelete }: {
  sessions: ChatSession[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  const sorted = [...sessions].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <button onClick={onNew} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium transition-colors">
          <Plus className="w-4 h-4 shrink-0" /> Nueva conversación
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {sorted.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6 px-3">Aún no tienes conversaciones.</p>
        )}
        {sorted.map(session => (
          <div key={session.id}
            className={`group relative flex items-start gap-2 w-full px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer ${
              session.id === activeId ? "bg-primary/15 text-foreground" : "hover:bg-white/5 text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => onSelect(session.id)}
          >
            <MessageSquare className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${session.id === activeId ? "text-primary" : ""}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{session.title}</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">{relativeTime(session.updatedAt)} · {session.messages.length} msg</p>
            </div>
            <button onClick={e => { e.stopPropagation(); onDelete(session.id); }}
              className="opacity-0 group-hover:opacity-100 shrink-0 p-1 rounded-md hover:bg-destructive/20 hover:text-destructive transition-all"
              title="Eliminar conversación"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────── */

export default function AgentePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastFailed, setLastFailed] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const supabase = createClient();

  const activeSession = sessions.find(s => s.id === activeSessionId) ?? null;
  const messages = activeSession?.messages ?? [];

  /* Auth + load sessions */
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        setToken(session.access_token);
        const stored = loadSessions(session.user.id);
        setSessions(stored);
        if (stored.length > 0) {
          const latest = [...stored].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
          setActiveSessionId(latest.id);
        } else {
          const fresh = newSession();
          setSessions([fresh]);
          setActiveSessionId(fresh.id);
        }
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setToken(session?.access_token ?? null);
      if (session?.user && !userId) setUserId(session.user.id);
    });
    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (userId && sessions.length > 0) saveSessions(userId, sessions);
  }, [sessions, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const startTimer = () => { setElapsedSecs(0); timerRef.current = setInterval(() => setElapsedSecs(s => s + 1), 1000); };
  const stopTimer  = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };

  const patchSession = useCallback((sid: string, updater: (s: ChatSession) => ChatSession) => {
    setSessions(prev => prev.map(s => s.id === sid ? updater(s) : s));
  }, []);

  const handleNewSession = () => {
    const s = newSession();
    setSessions(prev => [...prev, s]);
    setActiveSessionId(s.id);
    setError(null);
    setLastFailed(null);
    setSidebarOpen(false);
  };

  const handleDeleteSession = (id: string) => {
    setSessions(prev => {
      const next = prev.filter(s => s.id !== id);
      if (id === activeSessionId) {
        const last = next[next.length - 1];
        setActiveSessionId(last?.id ?? null);
        if (!last) {
          const fresh = newSession();
          setSessions([fresh]);
          setActiveSessionId(fresh.id);
          return [fresh];
        }
      }
      return next;
    });
  };

  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    setError(null);
    setSidebarOpen(false);
  };

  /* SSE-based send message */
  const sendMessage = useCallback(async (question: string) => {
    if (!activeSessionId || !token) return;
    setError(null);
    setLastFailed(null);

    const userMsg: ChatMessage = {
      id: `m-${Date.now()}`,
      role: "user",
      content: question,
      timestamp: new Date().toISOString(),
    };

    // Snapshot history before adding new user message (for API payload)
    let historySnapshot: { role: string; content: string }[] = [];
    setSessions(prev => {
      const session = prev.find(s => s.id === activeSessionId);
      if (session) {
        historySnapshot = session.messages
          .filter(m => m.role === "user" || m.role === "assistant")
          .map(m => ({ role: m.role, content: m.content }));
      }
      return prev;
    });

    patchSession(activeSessionId, s => ({
      ...s,
      title: s.messages.length === 0 ? autoTitle(question) : s.title,
      updatedAt: new Date().toISOString(),
      messages: [...s.messages, userMsg],
    }));

    setIsLoading(true);
    startTimer();

    // Create a placeholder assistant message that we'll populate via SSE
    const assistantMsgId = `m-${Date.now() + 1}`;
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      tool_calls: [],
      timestamp: new Date().toISOString(),
    };

    patchSession(activeSessionId, s => ({
      ...s,
      messages: [...s.messages, assistantMsg],
    }));

    try {
      const response = await fetch(`${API_BASE}/agente/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: question,
          session_id: activeSessionId,
          history: historySnapshot,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: `Error ${response.status}` }));
        throw new Error(err.detail || `Error ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No se pudo obtener el stream de respuesta.");

      const decoder = new TextDecoder();
      let buffer = "";
      let accumulatedContent = "";
      let pendingToolCalls: AgentToolCall[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const eventBlock of events) {
          if (!eventBlock.trim()) continue;

          const lines = eventBlock.split("\n");
          let eventType = "";
          let eventData = "";

          for (const line of lines) {
            if (line.startsWith("event: ")) eventType = line.slice(7).trim();
            if (line.startsWith("data: ")) eventData = line.slice(6).trim();
          }

          if (!eventType || !eventData) continue;

          try {
            const data = JSON.parse(eventData);

            if (eventType === "tool_call") {
              const tc: AgentToolCall = {
                id: `tc-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                name: data.name,
                arguments: data.arguments ?? {},
                status: "running",
              };
              pendingToolCalls = [...pendingToolCalls, tc];
              patchSession(activeSessionId, s => ({
                ...s,
                messages: s.messages.map(m =>
                  m.id === assistantMsgId ? { ...m, tool_calls: pendingToolCalls } : m
                ),
              }));
            } else if (eventType === "tool_result") {
              pendingToolCalls = pendingToolCalls.map(tc =>
                tc.name === data.name && tc.status === "running"
                  ? { ...tc, status: "completed", result: data.result }
                  : tc
              );
              patchSession(activeSessionId, s => ({
                ...s,
                messages: s.messages.map(m =>
                  m.id === assistantMsgId ? { ...m, tool_calls: pendingToolCalls } : m
                ),
              }));
            } else if (eventType === "content") {
              accumulatedContent += data.delta ?? "";
              patchSession(activeSessionId, s => ({
                ...s,
                messages: s.messages.map(m =>
                  m.id === assistantMsgId ? { ...m, content: accumulatedContent } : m
                ),
              }));
            } else if (eventType === "done") {
              accumulatedContent = data.content ?? accumulatedContent;
              patchSession(activeSessionId, s => ({
                ...s,
                updatedAt: new Date().toISOString(),
                messages: s.messages.map(m =>
                  m.id === assistantMsgId
                    ? { ...m, content: accumulatedContent, tool_calls: pendingToolCalls }
                    : m
                ),
              }));
            } else if (eventType === "error") {
              throw new Error(data.message ?? "Error desconocido del agente.");
            }
          } catch (parseErr) {
            if (parseErr instanceof Error && parseErr.message !== "Unexpected end of JSON input") {
              throw parseErr;
            }
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setError(msg);
      setLastFailed(question);
      // Remove empty assistant message on error
      patchSession(activeSessionId, s => ({
        ...s,
        messages: s.messages.filter(m => m.id !== assistantMsgId),
      }));
    } finally {
      stopTimer();
      setIsLoading(false);
    }
  }, [token, activeSessionId, patchSession]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const q = input.trim();
    setInput("");
    await sendMessage(q);
  };

  const handleRetry = async () => {
    if (!lastFailed || isLoading) return;
    const q = lastFailed;
    setLastFailed(null);
    setError(null);
    patchSession(activeSessionId!, s => {
      const msgs = [...s.messages];
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === "user") { msgs.splice(i, 1); break; }
      }
      return { ...s, messages: msgs };
    });
    await sendMessage(q);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  /* ── Render ── */
  return (
    <>
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.55); opacity: 0.35; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .msg-anim { animation: fadeIn 0.25s ease forwards; }
      `}</style>

      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={`fixed lg:relative inset-y-0 left-0 z-40 lg:z-auto w-64 bg-background border-r border-border flex flex-col transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
          style={{ top: 0, height: "100%" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/80">
            <span className="text-sm font-semibold">Mis conversaciones</span>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 rounded-md hover:bg-white/10">
              <X className="w-4 h-4" />
            </button>
          </div>
          <SessionsSidebar sessions={sessions} activeId={activeSessionId} onSelect={handleSelectSession} onNew={handleNewSession} onDelete={handleDeleteSession} />
        </aside>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Topbar */}
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-background/60 backdrop-blur-sm shrink-0">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 transition-colors">
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{activeSession?.title ?? "Agente EduAgent"}</p>
                {activeSession && activeSession.messages.length > 0 && (
                  <p className="text-[10px] text-muted-foreground">{activeSession.messages.length} mensajes · {relativeTime(activeSession.updatedAt)}</p>
                )}
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] text-primary border-primary/30 bg-primary/5 shrink-0">
              GPT-4o mini
            </Badge>
            <button onClick={handleNewSession} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1.5 rounded-lg hover:bg-primary/10">
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Nueva</span>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-5">
            {messages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
                <div className="p-5 rounded-2xl bg-primary/10 mb-5">
                  <Sparkles className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Agente EduAgent</h3>
                <p className="text-sm text-muted-foreground max-w-md mt-2">
                  Soy tu asistente pedagógico inteligente. Puedo consultar documentos, generar planeaciones,
                  mostrarte tus estadísticas y más — solo pregúntame.
                </p>
                <div className="flex flex-wrap gap-2 mt-5 max-w-xl justify-center">
                  {SUGGESTIONS.map(s => (
                    <button key={s} onClick={() => setInput(s)}
                      className="text-xs px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-primary/30 transition-all text-muted-foreground hover:text-foreground text-left">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-3 max-w-3xl msg-anim ${msg.role === "user" ? "ml-auto flex-row-reverse" : ""}`}>
                <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${msg.role === "user" ? "bg-primary/15" : "gradient-primary"}`}>
                  {msg.role === "user" ? <User className="w-4 h-4 text-primary" /> : <Bot className="w-4 h-4 text-white" />}
                </div>
                <div className={`space-y-2 min-w-0 ${msg.role === "user" ? "items-end flex flex-col" : ""}`} style={{ maxWidth: "80%" }}>
                  {/* Tool calls */}
                  {msg.tool_calls && msg.tool_calls.length > 0 && (
                    <div className="space-y-1.5 w-full">
                      {msg.tool_calls.map(tc => <ToolCallCard key={tc.id} tc={tc} />)}
                    </div>
                  )}
                  {/* Message bubble */}
                  {(msg.content || msg.role === "user") && (
                    <div className={`p-4 text-sm ${msg.role === "user" ? "chat-bubble-user" : "chat-bubble-assistant"}`}>
                      {msg.role === "user"
                        ? <p className="whitespace-pre-line">{msg.content}</p>
                        : msg.content
                          ? <FormattedContent content={msg.content} />
                          : <div className="flex gap-1">{[0,1,2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full bg-primary/60" style={{ animation: "bounce 1.4s ease-in-out infinite", animationDelay: `${i * 0.22}s` }} />)}</div>
                      }
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && messages.every(m => m.role === "user" || (m.role === "assistant" && !m.content && (!m.tool_calls || m.tool_calls.length === 0))) && (
              <ThinkingBubble elapsed={elapsedSecs} />
            )}

            {error && !isLoading && (
              <div className="flex gap-3 max-w-3xl animate-fade-in">
                <div className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center bg-destructive/15">
                  <AlertCircle className="w-4 h-4 text-destructive" />
                </div>
                <div className="space-y-2">
                  <div className="p-3 text-sm rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive">{error}</div>
                  {lastFailed && (
                    <button onClick={handleRetry} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                      <RefreshCw className="w-3 h-3" /> Reintentar
                    </button>
                  )}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border p-4 bg-background/80 backdrop-blur-xl shrink-0">
            <div className="max-w-3xl mx-auto flex gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                placeholder={isLoading ? "El agente está procesando…" : "Pregunta algo o pide una acción…"}
                className="flex-1 resize-none bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 min-h-[44px] max-h-[120px] disabled:opacity-50 disabled:cursor-not-allowed"
                rows={1}
              />
              <Button onClick={handleSend} disabled={!input.trim() || isLoading}
                className="gradient-primary text-white self-end h-11 px-4 disabled:opacity-40">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              Agente EduAgent · Puede cometer errores · Historial privado por usuario
            </p>
          </div>
        </div>
      </div>
    </>
  );
}


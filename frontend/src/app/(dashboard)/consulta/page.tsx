"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Send, Bot, User, FileText, ChevronDown, ChevronUp,
  Sparkles, AlertCircle, RefreshCw, Plus, Trash2,
  MessageSquare, Menu, X,
} from "lucide-react";
import type { ChatMessage, ChatSource } from "@/lib/types";
import { apiPost } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

/* ─── Types ─────────────────────────────────────────────────── */

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

/* ─── Storage helpers (namespaced per user) ──────────────────── */

const MAX_SESSIONS = 20;
const MAX_MESSAGES_PER_SESSION = 60;
const THINKING_STEPS = [
  "Analizando tu pregunta...",
  "Buscando en documentos pedagógicos...",
  "Recuperando contexto relevante...",
  "Generando respuesta con IA...",
];

function storageKey(userId: string) {
  return `eduagent_sessions_${userId}`;
}

function loadSessions(userId: string): ChatSession[] {
  if (typeof window === "undefined" || !userId) return [];
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatSession[];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function saveSessions(userId: string, sessions: ChatSession[]) {
  if (typeof window === "undefined" || !userId) return;
  try {
    // Trim each session's messages and keep only MAX_SESSIONS
    const trimmed = sessions.slice(-MAX_SESSIONS).map((s) => ({
      ...s,
      messages: s.messages.slice(-MAX_MESSAGES_PER_SESSION),
    }));
    localStorage.setItem(storageKey(userId), JSON.stringify(trimmed));
  } catch { /* ignore quota errors */ }
}

function newSession(): ChatSession {
  return {
    id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: "Nueva consulta",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [],
  };
}

function autoTitle(firstMessage: string) {
  return firstMessage.length > 45
    ? firstMessage.slice(0, 42) + "..."
    : firstMessage;
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Ahora";
  if (mins < 60) return `Hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Ayer";
  return `Hace ${days} días`;
}

/* ─── Sub-components ────────────────────────────────────────── */

function SourceCard({ source }: { source: ChatSource }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className="text-left w-full p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-xs"
    >
      <div className="flex items-center gap-2">
        <FileText className="w-3 h-3 text-primary shrink-0" />
        <span className="font-medium truncate">{source.documento_nombre}</span>
        <Badge className="ml-auto text-[9px] bg-primary/15 text-primary border-0 shrink-0">
          {(source.relevancia * 100).toFixed(0)}%
        </Badge>
        {expanded ? <ChevronUp className="w-3 h-3 shrink-0" /> : <ChevronDown className="w-3 h-3 shrink-0" />}
      </div>
      {expanded && (
        <p className="mt-1.5 text-muted-foreground leading-relaxed">{source.fragmento}</p>
      )}
    </button>
  );
}

function FormattedContent({ content }: { content: string }) {
  const parts = content.split(/(\*\*[^*]+\*\*)/g);
  return (
    <div className="whitespace-pre-line leading-relaxed">
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**")
          ? <strong key={i}>{part.slice(2, -2)}</strong>
          : <span key={i}>{part}</span>
      )}
    </div>
  );
}

function ThinkingBubble({ elapsed }: { elapsed: number }) {
  const stepIndex = Math.min(Math.floor(elapsed / 5), THINKING_STEPS.length - 1);
  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center gradient-primary">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="chat-bubble-assistant p-4 space-y-2 max-w-xs">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="w-2 h-2 rounded-full bg-primary/70"
              style={{ animation: "bounce 1.4s ease-in-out infinite", animationDelay: `${i * 0.22}s` }} />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{THINKING_STEPS[stepIndex]}</p>
        {elapsed > 5 && (
          <p className="text-[10px] text-muted-foreground/50">{elapsed}s · puede tardar hasta 30s</p>
        )}
      </div>
    </div>
  );
}

const SUGGESTIONS = [
  "¿Qué es la escuela nueva?",
  "¿Qué dice la constitución sobre la educación?",
  "¿Cómo se evalúa la comprensión lectora?",
];

/* ─── Sessions sidebar ──────────────────────────────────────── */

interface SessionsSidebarProps {
  sessions: ChatSession[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

function SessionsSidebar({ sessions, activeId, onSelect, onNew, onDelete }: SessionsSidebarProps) {
  const sorted = [...sessions].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  return (
    <div className="flex flex-col h-full">
      {/* New chat button */}
      <div className="p-3 border-b border-border">
        <button
          onClick={onNew}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4 shrink-0" />
          Nueva consulta
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {sorted.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6 px-3">
            Aún no tienes consultas. ¡Empieza una nueva!
          </p>
        )}
        {sorted.map((session) => (
          <div
            key={session.id}
            className={`group relative flex items-start gap-2 w-full px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer ${
              session.id === activeId
                ? "bg-primary/15 text-foreground"
                : "hover:bg-white/5 text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => onSelect(session.id)}
          >
            <MessageSquare className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${session.id === activeId ? "text-primary" : ""}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{session.title}</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                {relativeTime(session.updatedAt)} · {session.messages.length} msg
              </p>
            </div>
            {/* Delete button — shows on hover */}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(session.id); }}
              className="opacity-0 group-hover:opacity-100 shrink-0 p-1 rounded-md hover:bg-destructive/20 hover:text-destructive transition-all"
              title="Eliminar sesión"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────────────── */

export default function ConsultaPage() {
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

  // Active session object derived from state
  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;
  const messages = activeSession?.messages ?? [];

  /* Auth + load sessions */
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        setToken(session.access_token);
        const stored = loadSessions(session.user.id);
        setSessions(stored);
        // Auto-select the most-recent session, or create a fresh one
        if (stored.length > 0) {
          const latest = [...stored].sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )[0];
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

  /* Persist sessions on change */
  useEffect(() => {
    if (userId && sessions.length > 0) saveSessions(userId, sessions);
  }, [sessions, userId]);

  /* Scroll to bottom */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  /* Timer helpers */
  const startTimer = () => {
    setElapsedSecs(0);
    timerRef.current = setInterval(() => setElapsedSecs((s) => s + 1), 1000);
  };
  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  /* Update the active session's messages */
  const patchSession = useCallback((sessionId: string, updater: (s: ChatSession) => ChatSession) => {
    setSessions((prev) => prev.map((s) => s.id === sessionId ? updater(s) : s));
  }, []);

  /* Create new session */
  const handleNewSession = () => {
    const s = newSession();
    setSessions((prev) => [...prev, s]);
    setActiveSessionId(s.id);
    setError(null);
    setLastFailed(null);
    setSidebarOpen(false);
  };

  /* Delete session */
  const handleDeleteSession = (id: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (id === activeSessionId) {
        const last = next[next.length - 1];
        setActiveSessionId(last?.id ?? null);
        if (!last) {
          // No sessions left — create a fresh one
          const fresh = newSession();
          setSessions([fresh]);
          setActiveSessionId(fresh.id);
          return [fresh];
        }
      }
      return next;
    });
  };

  /* Select session */
  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    setError(null);
    setSidebarOpen(false);
  };

  /* Send message */
  const sendMessage = useCallback(async (question: string) => {
    if (!activeSessionId) return;
    setError(null);
    setLastFailed(null);

    const userMsg: ChatMessage = {
      id: `m-${Date.now()}`,
      role: "user",
      content: question,
      timestamp: new Date().toISOString(),
    };

    // Add user message + update session title from first message
    patchSession(activeSessionId, (s) => ({
      ...s,
      title: s.messages.length === 0 ? autoTitle(question) : s.title,
      updatedAt: new Date().toISOString(),
      messages: [...s.messages, userMsg],
    }));

    setIsLoading(true);
    startTimer();

    try {
      if (!token) throw new Error("Sesión no iniciada. Recarga la página.");

      const data = await apiPost<{
        id?: string; content?: string; output?: string;
        sources?: ChatSource[]; timestamp?: string;
      }>("/consulta/", { pregunta: question }, token);

      const assistantMsg: ChatMessage = {
        id: data.id ?? `m-${Date.now() + 1}`,
        role: "assistant",
        content: data.content ?? data.output ?? "Sin respuesta.",
        sources: data.sources ?? [],
        timestamp: data.timestamp ?? new Date().toISOString(),
      };

      patchSession(activeSessionId, (s) => ({
        ...s,
        updatedAt: new Date().toISOString(),
        messages: [...s.messages, assistantMsg],
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setError(msg);
      setLastFailed(question);
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
    // Remove the orphan user message before retrying
    patchSession(activeSessionId!, (s) => {
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
      `}</style>

      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">

        {/* ── Mobile sidebar overlay ── */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── Sessions sidebar ── */}
        <aside
          className={`
            fixed lg:relative inset-y-0 left-0 z-40 lg:z-auto
            w-64 bg-background border-r border-border flex flex-col
            transition-transform duration-200
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          `}
          style={{ top: 0, height: "100%" }}
        >
          {/* Sidebar header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/80">
            <span className="text-sm font-semibold">Mis consultas</span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded-md hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <SessionsSidebar
            sessions={sessions}
            activeId={activeSessionId}
            onSelect={handleSelectSession}
            onNew={handleNewSession}
            onDelete={handleDeleteSession}
          />
        </aside>

        {/* ── Chat area ── */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Chat topbar */}
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-background/60 backdrop-blur-sm shrink-0">
            {/* Mobile sidebar toggle */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {activeSession?.title ?? "Nueva consulta"}
              </p>
              {activeSession && activeSession.messages.length > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  {activeSession.messages.length} mensajes · {relativeTime(activeSession.updatedAt)}
                </p>
              )}
            </div>
            <button
              onClick={handleNewSession}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1.5 rounded-lg hover:bg-primary/10"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Nueva</span>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
            {messages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
                <div className="p-4 rounded-2xl bg-primary/10 mb-4">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Consulta a EduAgent</h3>
                <p className="text-sm text-muted-foreground max-w-md mt-1">
                  Pregunta sobre los documentos pedagógicos cargados en el sistema.
                  La IA buscará en la base de conocimiento vectorial para darte respuestas contextualizadas.
                </p>
                <div className="flex flex-wrap gap-2 mt-4 max-w-lg justify-center">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => setInput(s)}
                      className="text-xs px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-primary/30 transition-all text-muted-foreground hover:text-foreground">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id}
                className={`flex gap-3 max-w-3xl animate-fade-in ${msg.role === "user" ? "ml-auto flex-row-reverse" : ""}`}>
                <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${msg.role === "user" ? "bg-primary/15" : "gradient-primary"}`}>
                  {msg.role === "user" ? <User className="w-4 h-4 text-primary" /> : <Bot className="w-4 h-4 text-white" />}
                </div>
                <div className={`space-y-2 max-w-[80%] ${msg.role === "user" ? "text-right" : ""}`}>
                  <div className={`p-4 text-sm ${msg.role === "user" ? "chat-bubble-user" : "chat-bubble-assistant"}`}>
                    <FormattedContent content={msg.content} />
                  </div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Fuentes consultadas</p>
                      {msg.sources.map((src, i) => <SourceCard key={i} source={src} />)}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && <ThinkingBubble elapsed={elapsedSecs} />}

            {error && !isLoading && (
              <div className="flex gap-3 max-w-3xl animate-fade-in">
                <div className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center bg-destructive/15">
                  <AlertCircle className="w-4 h-4 text-destructive" />
                </div>
                <div className="space-y-2">
                  <div className="p-3 text-sm rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive">{error}</div>
                  {lastFailed && (
                    <button onClick={handleRetry}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                      <RefreshCw className="w-3 h-3" />Reintentar
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
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                placeholder={isLoading ? "EduAgent está procesando tu consulta..." : "Pregunta sobre los documentos pedagógicos del curso..."}
                className="flex-1 resize-none bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 min-h-[44px] max-h-[120px] disabled:opacity-50 disabled:cursor-not-allowed"
                rows={1}
              />
              <Button onClick={handleSend} disabled={!input.trim() || isLoading}
                className="gradient-primary text-white self-end h-11 px-4 disabled:opacity-40">
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              EduAgent puede cometer errores · Cada usuario tiene su propio historial privado
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

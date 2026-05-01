import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Heart, MessageCircle, Menu, X, Search, Sparkles, Loader2, Bookmark } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { TopBar } from "@/components/TopBar";
import { ChatWidget } from "@/components/ChatWidget";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

type ResearchType = "all" | string;
type Research = {
  id: string;
  title: string;
  description: string;
  header_image_url: string | null;
  category: string;
  research_type: string;
  section: string | null;
  research_number: string | null;
  created_at: string;
  like_count: number;
  comment_count: number;
};

export const Route = createFileRoute("/dashboard")({
  component: () => <RequireAuth><Dashboard /></RequireAuth>,
  head: () => ({ meta: [{ title: "Dashboard — Ecomedic Squad" }] }),
});

const TYPE_LABELS: Record<string, string> = {
  disease: "Disease",
  drugs: "Medicine",
  discovery: "Discovery",
};
const DEFAULT_TYPES = ["disease", "drugs", "discovery"];

function Dashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [researchType, setResearchType] = useState<ResearchType>("all");
  const [category, setCategory] = useState<string>("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: savedIds = [] } = useQuery({
    queryKey: ["saved-research-ids", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("saved_research").select("research_id").eq("user_id", user!.id);
      return (data ?? []).map((s: any) => s.research_id) as string[];
    },
  });

  const toggleSave = async (researchId: string) => {
    if (!user) return;
    const isSaved = savedIds.includes(researchId);
    if (isSaved) {
      await supabase.from("saved_research").delete().eq("user_id", user.id).eq("research_id", researchId);
    } else {
      await supabase.from("saved_research").insert({ user_id: user.id, research_id: researchId });
    }
    qc.invalidateQueries({ queryKey: ["saved-research-ids"] });
    qc.invalidateQueries({ queryKey: ["saved-research"] });
  };

  const { data: research = [], isLoading } = useQuery({
    queryKey: ["research-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("research")
        .select("id, title, description, header_image_url, category, research_type, section, research_number, created_at, likes(count), comments(count)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        ...r,
        like_count: r.likes?.[0]?.count ?? 0,
        comment_count: r.comments?.[0]?.count ?? 0,
      })) as Research[];
    },
  });

  // Always show default types; include any extras found in data
  const types = useMemo(() => {
    const set = new Set<string>(DEFAULT_TYPES);
    research.forEach((r) => { if (r.research_type) set.add(r.research_type); });
    return [...DEFAULT_TYPES, ...Array.from(set).filter((t) => !DEFAULT_TYPES.includes(t)).sort()];
  }, [research]);

  // Categories available for the selected type
  const categories = useMemo(() => {
    const set = new Set<string>();
    research.forEach((r) => {
      if (researchType !== "all" && r.research_type !== researchType) return;
      if (r.category && r.category !== r.research_type) set.add(r.category);
    });
    return Array.from(set).sort();
  }, [research, researchType]);

  // Reset category when type changes and current category is no longer valid
  useEffect(() => {
    if (category !== "all" && !categories.includes(category)) setCategory("all");
  }, [categories, category]);

  const filtered = useMemo(() => {
    let list = research;
    if (researchType !== "all") list = list.filter((r) => r.research_type === researchType);
    if (category !== "all") list = list.filter((r) => r.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) =>
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        (r.section ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [research, researchType, category, search]);

  // AI search state
  const [aiIds, setAiIds] = useState<string[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const aiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (aiTimer.current) clearTimeout(aiTimer.current);
    const q = sidebarSearch.trim();
    if (!q) {
      setAiIds(null);
      setAiLoading(false);
      setAiError(null);
      return;
    }
    setAiLoading(true);
    setAiError(null);
    aiTimer.current = setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke("ai-research-search", {
          body: { query: q, items: research },
        });
        if (error) throw error;
        setAiIds(Array.isArray(data?.ids) ? data.ids : []);
      } catch (e: any) {
        setAiError(e?.message ?? "AI search failed");
        setAiIds(null);
      } finally {
        setAiLoading(false);
      }
    }, 500);
    return () => { if (aiTimer.current) clearTimeout(aiTimer.current); };
  }, [sidebarSearch, research]);

  const sidebarList = useMemo(() => {
    if (aiIds && sidebarSearch.trim()) {
      const map = new Map(research.map((r) => [r.id, r]));
      return aiIds.map((id) => map.get(id)).filter(Boolean) as Research[];
    }
    return [...research].sort((a, b) => a.title.localeCompare(b.title));
  }, [research, aiIds, sidebarSearch]);

  return (
    <div className="min-h-screen">
      <TopBar search={search} onSearchChange={setSearch} homeTo="/dashboard" profileTo="/profile" />

      {/* Research type strip */}
      <div className="sticky top-[72px] z-20 border-b border-border bg-background/40 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-12 flex items-center gap-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setSidebarOpen((s) => !s)}
            className="shrink-0 p-2 rounded-md hover:bg-muted/50 mr-1"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            onClick={() => setResearchType("all")}
            className={cn(
              "shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all border",
              researchType === "all"
                ? "gradient-bg text-primary-foreground border-transparent glow"
                : "border-border hover:bg-muted/50 text-muted-foreground"
            )}
          >
            All
          </button>
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setResearchType(t)}
              className={cn(
                "shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all border capitalize",
                researchType === t
                  ? "gradient-bg text-primary-foreground border-transparent glow"
                  : "border-border hover:bg-muted/50 text-muted-foreground"
              )}
            >
              {TYPE_LABELS[t] ?? t}
            </button>
          ))}
        </div>
      </div>

      {/* Categories strip (filtered by selected type) */}
      {categories.length > 0 && (
        <div className="sticky top-[120px] z-20 border-b border-border bg-background/20 backdrop-blur-sm">
          <div className="container mx-auto px-4 h-11 flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setCategory("all")}
              className={cn(
                "shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all border",
                category === "all"
                  ? "bg-primary/15 text-primary border-primary/40"
                  : "border-border hover:bg-muted/50 text-muted-foreground"
              )}
            >
              All categories
            </button>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  "shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all border capitalize",
                  category === c
                    ? "bg-primary/15 text-primary border-primary/40"
                    : "border-border hover:bg-muted/50 text-muted-foreground"
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed lg:sticky top-[164px] left-0 z-20 h-[calc(100vh-164px)] w-72 glass-strong border-r border-border transition-transform overflow-y-auto",
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0 lg:w-0 lg:border-0"
          )}
        >
          {sidebarOpen && (
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> AI Research Search
                </h3>
                <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 hover:bg-muted/50 rounded">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="relative">
                {aiLoading ? (
                  <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary animate-spin" />
                ) : (
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                )}
                <Input
                  value={sidebarSearch}
                  onChange={(e) => setSidebarSearch(e.target.value)}
                  placeholder="Ask AI: e.g. cancer drugs, antibiotics..."
                  className="pl-9 glass h-9"
                />
              </div>
              {aiError && <p className="text-xs text-destructive">{aiError}</p>}
              {!sidebarSearch.trim() && (
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">All research (A–Z)</p>
              )}
              <ul className="space-y-1 text-sm">
                {sidebarList.map((r, i) => (
                  <li key={r.id}>
                    <Link
                      to="/research/$id" params={{ id: r.id }}
                      className="flex gap-2 p-2 rounded-md hover:bg-muted/50 transition"
                      onClick={() => setSidebarOpen(false)}
                    >
                      <span className="text-muted-foreground text-xs w-6 shrink-0 mt-0.5">{i + 1}.</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{r.title}</div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                          {r.research_number && <span className="font-mono text-[10px]">{r.research_number}</span>}
                          {r.section && <span className="truncate">{r.section}</span>}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
                {!aiLoading && sidebarList.length === 0 && (
                  <li className="text-xs text-muted-foreground p-2">No research found.</li>
                )}
              </ul>
            </div>
          )}
        </aside>

        {/* Main grid */}
        <main className="flex-1 container mx-auto px-4 py-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="glass rounded-2xl h-72 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="glass-strong rounded-2xl p-12 text-center">
              <h2 className="text-xl font-semibold">No research yet</h2>
              <p className="text-muted-foreground mt-2 text-sm">
                Check back soon — our team is publishing new studies regularly.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 w-[90%] mx-auto">
              {filtered.map((r) => <ResearchCard key={r.id} r={r} saved={savedIds.includes(r.id)} onToggleSave={() => toggleSave(r.id)} />)}
            </div>
          )}
        </main>
      </div>
      {/* Floating saved page button - above chat widget */}
      <Link
        to="/saved"
        className="fixed right-4 bottom-[14vh] z-40 h-14 w-14 rounded-full gradient-bg text-primary-foreground shadow-lg glow flex items-center justify-center hover:scale-105 transition"
        aria-label="Saved research"
      >
        <Bookmark className="h-6 w-6" />
      </Link>
      <ChatWidget />
    </div>
  );
}

function ResearchCard({ r, saved, onToggleSave }: { r: Research; saved: boolean; onToggleSave: () => void }) {
  return (
    <div className="glass rounded-2xl overflow-hidden hover:glow transition-all group flex flex-col relative">
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSave(); }}
        className="absolute top-3 right-3 z-10 h-8 w-8 rounded-full bg-background/70 backdrop-blur flex items-center justify-center transition hover:scale-110"
        title={saved ? "Remove from saved" : "Save research"}
      >
        <Bookmark className={cn("h-4 w-4", saved ? "fill-primary text-primary" : "text-muted-foreground")} />
      </button>
      <Link
        to="/research/$id" params={{ id: r.id }}
        className="flex flex-col flex-1"
      >
        <div className="aspect-video bg-muted/30 relative overflow-hidden">
          {r.header_image_url ? (
            <img src={r.header_image_url} alt={r.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
          ) : (
            <div className="h-full w-full gradient-bg opacity-30" />
          )}
          <span className="absolute top-3 left-3 text-[10px] uppercase tracking-wider bg-background/70 backdrop-blur px-2 py-1 rounded-full font-semibold">
            {r.category}
          </span>
        </div>
        <div className="p-4 flex-1 flex flex-col">
          <h3 className="font-semibold text-base line-clamp-2">{r.title}</h3>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-3 flex-1">{r.description}</p>
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> {r.like_count}</span>
            <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> {r.comment_count}</span>
          </div>
        </div>
      </Link>
    </div>
  );
}


import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { 
  Bold, Italic, Underline as UnderlineIcon, Type, Palette, 
  Upload, X, Check, Image as ImageIcon, Loader2, Plus, 
  Monitor, Smartphone, Link as LinkIcon, Trash2, 
  AlignLeft, AlignCenter, AlignRight, List, ListOrdered, Undo, Redo,
  LayoutTemplate, Maximize2, Square, Circle, RectangleHorizontal, RectangleVertical, Frame
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { uploadWithSupabaseRetry } from "@/lib/supabase-retry";
import { toast } from "sonner";

// --- 4 NEW PORTFOLIO TEMPLATES ---
const BUILT_IN_TEMPLATES = [
  {
    id: "port-modern-minimal",
    name: "Modern Minimalist",
    html: `
      <div class="max-w-5xl mx-auto p-8 md:p-16 bg-white text-zinc-900 font-sans min-h-screen">
        <header class="mb-16 border-b border-zinc-200 pb-12 text-center md:text-left">
          <h1 class="text-5xl md:text-7xl font-light tracking-tighter mb-4 text-zinc-900">Alex Morgan.</h1>
          <p class="text-xl md:text-2xl text-zinc-500 font-light">Digital Designer & Art Director</p>
        </header>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <img src="https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=800&auto=format&fit=crop" alt="Abstract Art" style="width:100%; aspect-ratio:3/4; object-fit:cover; border-radius:0;" class="shadow-md hover:shadow-xl transition-shadow duration-300" />
          </div>
          <div class="flex flex-col justify-center space-y-6">
            <h2 class="text-3xl font-medium tracking-tight">Selected Works</h2>
            <p class="text-zinc-600 text-lg leading-relaxed">A focus on typography, functional whitespace, and brutalist architecture applied to the digital realm. I craft experiences that are both beautiful and brutally efficient.</p>
            <div>
              <a href="#" class="inline-block border border-zinc-900 px-8 py-3 hover:bg-zinc-900 hover:text-white transition-colors text-sm uppercase tracking-widest font-medium">View Projects</a>
            </div>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "port-pastel-dream",
    name: "Pastel Dream",
    html: `
      <div class="max-w-4xl mx-auto p-10 bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100 min-h-screen rounded-[3rem] text-slate-800 font-sans shadow-2xl my-4 md:my-10 border-4 border-white">
        <div class="text-center mt-8 mb-16">
          <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300&auto=format&fit=crop" alt="Profile" style="width:160px; border-radius:50%; aspect-ratio:1/1; object-fit:cover;" class="mx-auto shadow-xl mb-8 border-4 border-white" />
          <h1 class="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500 mb-4 drop-shadow-sm">Hi, I'm Sam ✨</h1>
          <p class="text-xl text-slate-600 font-medium max-w-lg mx-auto">I make the internet a cuter, friendlier place through colorful UI/UX design.</p>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4">
          <div class="bg-white/60 backdrop-blur-md p-8 rounded-3xl shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
            <h3 class="text-2xl font-bold text-purple-600 mb-3">🎨 Illustrations</h3>
            <p class="text-slate-600">Vector art, character design, and vibrant digital paintings.</p>
          </div>
          <div class="bg-white/60 backdrop-blur-md p-8 rounded-3xl shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
            <h3 class="text-2xl font-bold text-pink-500 mb-3">📱 Interfaces</h3>
            <p class="text-slate-600">Mobile apps and web platforms with a focus on joy and usability.</p>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "port-neon-pulse",
    name: "Neon Pulse",
    html: `
      <div class="max-w-5xl mx-auto p-10 bg-zinc-950 text-white min-h-screen font-mono border border-cyan-900/30 shadow-[0_0_50px_rgba(6,182,212,0.1)] relative overflow-hidden">
        <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500"></div>
        <div class="relative z-10 flex flex-col md:flex-row gap-12 items-center mt-12">
          <div class="w-full md:w-3/5 space-y-6">
            <span class="text-cyan-400 font-bold tracking-widest text-sm uppercase">/// System.Online</span>
            <h1 class="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 drop-shadow-[0_0_10px_rgba(34,211,238,0.4)]">J.D. CYBER</h1>
            <p class="text-zinc-400 text-lg border-l-2 border-pink-500 pl-4">Full-stack engineer building the decentralized future. Web3, Smart Contracts, and Immersive 3D Experiences.</p>
            <div class="pt-6">
              <button class="bg-transparent border border-cyan-400 text-cyan-400 px-6 py-3 font-bold hover:bg-cyan-400 hover:text-black transition-all shadow-[0_0_15px_rgba(34,211,238,0.2)] hover:shadow-[0_0_25px_rgba(34,211,238,0.6)]">INITIALIZE_CONTACT</button>
            </div>
          </div>
          <div class="w-full md:w-2/5">
             <img src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=600&auto=format&fit=crop" alt="Cyberpunk City" style="width:100%; aspect-ratio:1/1; object-fit:cover; border-radius:0;" class="border border-zinc-800 shadow-[0_0_30px_rgba(236,72,153,0.15)]" />
          </div>
        </div>
      </div>
    `
  },
  {
    id: "port-midnight-science",
    name: "Midnight Science",
    html: `
      <div class="max-w-4xl mx-auto p-12 bg-[#0a0f18] text-slate-300 min-h-screen font-serif" style="background-image: radial-gradient(#1e293b 1px, transparent 1px); background-size: 24px 24px;">
        <div class="bg-[#0f172a]/90 backdrop-blur-xl p-10 md:p-16 border border-slate-800 rounded-lg shadow-2xl">
          <div class="text-center space-y-4 mb-12">
            <h4 class="text-emerald-400/80 font-sans uppercase tracking-[0.3em] text-xs font-bold">Research & Development</h4>
            <h1 class="text-4xl md:text-5xl text-slate-100 font-normal tracking-wide">Dr. Elena Rostova</h1>
            <div class="w-16 h-px bg-slate-700 mx-auto mt-6"></div>
          </div>
          
          <div class="space-y-8 text-lg leading-relaxed text-slate-400">
            <p><strong class="text-slate-200">Abstract:</strong> Specializing in machine learning methodologies applied to astrophysical phenomena. My current work explores deep neural network optimizations for identifying exoplanet transits in noisy datasets.</p>
            
            <img src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&auto=format&fit=crop" alt="Nebula" style="width:100%; aspect-ratio:16/9; object-fit:cover; border-radius:8px;" class="border border-slate-800 grayscale hover:grayscale-0 transition-all duration-700" />
            
            <p>Recent publications feature breakthroughs in computational efficiency, allowing real-time data processing from orbital telescopes. Feel free to explore my dataset repositories or read my latest journal entries.</p>
          </div>
          
          <div class="mt-12 text-center">
             <a href="#" class="text-slate-300 font-sans text-sm border-b border-emerald-500/50 pb-1 hover:text-emerald-400 hover:border-emerald-400 transition-colors">Access Publications &rarr;</a>
          </div>
        </div>
      </div>
    `
  }
];
// ---------------------------------------------

type Props = {
  initialHtml: string;
  onCancel: () => void;
  onDone: (html: string) => void;
};

const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 56, 64, 72, 96];
const TEXT_TAGS = "h1,h2,h3,h4,h5,h6,p,span,a,blockquote,li,td,th,figcaption,strong,em,small,label,button";

export function TemplateInlineEditor({ initialHtml, onCancel, onDone }: Props) {
  const { user } = useAuth();
  const stageRef = useRef<HTMLDivElement>(null);
  
  // Toolbars & State
  const [textToolbar, setTextToolbar] = useState<{ left: number; top: number; el: HTMLElement } | null>(null);
  const [mediaToolbar, setMediaToolbar] = useState<{ left: number; top: number; el: HTMLElement } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [lastSelectedEl, setLastSelectedEl] = useState<HTMLElement | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // History Stack (Undo/Redo)
  const [history, setHistory] = useState<string[]>([initialHtml]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const replaceImgRef = useRef<HTMLInputElement>(null);
  const insertImgRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    if (!stageRef.current) return;
    stageRef.current.innerHTML = history[historyIndex] || "";
  }, [historyIndex]);

  // FIXED SAVE STATE
  const saveState = useCallback(() => {
    setTimeout(() => {
      if (!stageRef.current) return;
      const html = stageRef.current.innerHTML;
      
      setHistory((prev) => {
        const newHistory = prev.slice(0, historyIndex + 1);
        if (newHistory[newHistory.length - 1] === html) {
          return prev; 
        }
        newHistory.push(html);
        setHistoryIndex(newHistory.length - 1);
        return newHistory;
      });
    }, 50);
  }, [historyIndex]);

  const closeToolbars = useCallback(() => {
    if (textToolbar) {
      textToolbar.el.removeAttribute("contenteditable");
      textToolbar.el.style.outline = "";
      saveState(); 
    }
    if (mediaToolbar) {
        mediaToolbar.el.style.outline = "";
    }
    setTextToolbar(null);
    setMediaToolbar(null);
  }, [textToolbar, mediaToolbar, saveState]);

  const loadTemplate = (id: string) => {
    const template = BUILT_IN_TEMPLATES.find(t => t.id === id);
    if (!template) return;
    if (!confirm("Loading a new template will overwrite your current progress. Continue?")) return;
    
    closeToolbars();
    setHistory([template.html]);
    setHistoryIndex(0);
    toast.success(`${template.name} loaded`);
  };

  const positionToolbarFor = (el: HTMLElement): { left: number; top: number } => {
    const rect = el.getBoundingClientRect();
    const top = Math.max(60, rect.top - 50);
    const left = Math.min(window.innerWidth - 320, Math.max(8, rect.left));
    return { left, top };
  };

  const handleStageClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target || !stageRef.current?.contains(target)) return;

    const media = target.closest("img, video, iframe") as HTMLElement | null;
    if (media) {
      e.preventDefault(); e.stopPropagation();
      closeToolbars();
      media.style.outline = "3px solid hsl(var(--primary))";
      setLastSelectedEl(media);
      setMediaToolbar({ ...positionToolbarFor(media), el: media });
      return;
    }

    const textEl = target.closest(TEXT_TAGS) as HTMLElement | null;
    if (textEl && stageRef.current.contains(textEl)) {
      e.preventDefault(); e.stopPropagation();
      if (textToolbar && textToolbar.el !== textEl) {
        textToolbar.el.removeAttribute("contenteditable");
        textToolbar.el.style.outline = "";
        saveState();
      }
      textEl.setAttribute("contenteditable", "true");
      textEl.style.outline = "2px dashed hsl(var(--primary))";
      textEl.focus();
      setLastSelectedEl(textEl);
      setMediaToolbar(null);
      setTextToolbar({ ...positionToolbarFor(textEl), el: textEl });
    } else {
      closeToolbars();
    }
  };

  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    saveState();
  };

  const applyLink = () => {
    const url = prompt("Enter URL (include https://):", "https://");
    if (url) exec("createLink", url);
  };

  const setAlignment = (align: "left" | "center" | "right") => {
    if (!textToolbar) return;
    textToolbar.el.style.textAlign = align;
    saveState();
  };

  const setFontSize = (px: number) => {
    if (!textToolbar) return;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed && textToolbar.el.contains(sel.anchorNode)) {
      const range = sel.getRangeAt(0);
      const span = document.createElement("span");
      span.style.fontSize = `${px}px`;
      try {
        span.appendChild(range.extractContents());
        range.insertNode(span);
        sel.removeAllRanges();
        const newRange = document.createRange();
        newRange.selectNodeContents(span);
        sel.addRange(newRange);
      } catch { /* ignore */ }
    } else {
      textToolbar.el.style.fontSize = `${px}px`;
    }
    saveState();
  };

  const setColor = (color: string) => {
    if (!textToolbar) return;
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && textToolbar.el.contains(sel.anchorNode)) {
      const range = sel.getRangeAt(0);
      const span = document.createElement("span");
      span.style.color = color;
      try {
        span.appendChild(range.extractContents());
        range.insertNode(span);
      } catch { /* ignore */ }
    } else {
      textToolbar.el.style.color = color;
    }
    saveState();
  };

  const deleteElement = (el: HTMLElement) => {
    el.remove();
    closeToolbars();
    setLastSelectedEl(null);
    saveState();
    toast.success("Element deleted");
  };

  const insertElementSmartly = (newEl: HTMLElement) => {
    if (lastSelectedEl && stageRef.current?.contains(lastSelectedEl)) {
      lastSelectedEl.insertAdjacentElement("afterend", newEl);
    } else {
      stageRef.current?.appendChild(newEl);
    }
    setLastSelectedEl(newEl);
    saveState();
  };

  const uploadFile = async (file: File, kind: "image" | "video"): Promise<string | null> => {
    if (!user) { toast.error("Sign in required"); return null; }
    const max = kind === "image" ? 10 : 100;
    if (file.size > max * 1024 * 1024) { toast.error(`Max ${max}MB`); return null; }
    const ext = file.name.split(".").pop() || (kind === "image" ? "png" : "mp4");
    const path = `${user.id}/${kind}/${Date.now()}.${ext}`;
    setUploading(true);
    const { error } = await uploadWithSupabaseRetry("research-media", path, file, { contentType: file.type }, 6);
    setUploading(false);
    if (error) { toast.error(error.message || "Upload failed"); return null; }
    const { data } = supabase.storage.from("research-media").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    toast.info("Uploading dropped image...");
    
    // Find where the user dropped it
    let range: Range | null = null;
    if (document.caretRangeFromPoint) {
      range = document.caretRangeFromPoint(e.clientX, e.clientY);
    } else if ((document as any).caretPositionFromPoint) {
      const pos = (document as any).caretPositionFromPoint(e.clientX, e.clientY);
      if (pos) {
        range = document.createRange();
        range.setStart(pos.offsetNode, pos.offset);
        range.collapse(true);
      }
    }

    const url = await uploadFile(file, "image");
    if (!url) return;

    const img = document.createElement("img");
    img.src = url;
    // Default initial styles
    img.style.cssText = "width:100%;height:auto;aspect-ratio:auto;object-fit:cover;border-radius:0;margin:1rem auto;display:block;";
    
    if (range) {
      range.insertNode(img);
    } else {
      stageRef.current?.appendChild(img);
    }
    
    saveState();
    toast.success("Image added from drop");
  };

  const onReplaceImg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f || !mediaToolbar) return;
    const url = await uploadFile(f, "image");
    if (!url) return;
    if (mediaToolbar.el.tagName === "IMG") {
      (mediaToolbar.el as HTMLImageElement).src = url;
    } else {
      const img = document.createElement("img");
      img.src = url;
      img.style.cssText = mediaToolbar.el.getAttribute("style") || "width:100%;height:auto;";
      mediaToolbar.el.replaceWith(img);
      setMediaToolbar({ ...positionToolbarFor(img), el: img });
    }
    saveState();
    toast.success("Image replaced");
  };

  const insertNewImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    const url = await uploadFile(f, "image");
    if (!url) return;
    const img = document.createElement("img");
    img.src = url;
    img.style.cssText = "width:100%;height:auto;display:block;margin:1rem auto;";
    insertElementSmartly(img);
    toast.success("Image added");
  };

  const insertNewTextBox = () => {
    const box = document.createElement("p");
    box.textContent = "New text block";
    box.style.cssText = "padding:.5rem;margin:1rem 0;font-size:1rem;line-height:1.6;";
    insertElementSmartly(box);
    toast.success("Text box added");
  };

  // Image Manipulation
  const setMediaWidth = (width: string) => {
    if (!mediaToolbar) return;
    mediaToolbar.el.style.width = `${width}%`;
    saveState();
  };

  const applyCrop = (aspectRatio: string, rounded: string = '0', objectFit: string = 'cover') => {
    if (!mediaToolbar) return;
    mediaToolbar.el.style.aspectRatio = aspectRatio;
    mediaToolbar.el.style.borderRadius = rounded;
    mediaToolbar.el.style.objectFit = objectFit;
    saveState();
  };

  const handleDone = () => {
    closeToolbars(); 
    const html = stageRef.current?.innerHTML || "";
    onDone(html);
  };

  return createPortal(
    <div className="fixed inset-0 z-[2147483600] bg-background flex flex-col">
      {uploading && (
        <div className="absolute inset-0 z-[9999] flex items-center justify-center bg-background/50 backdrop-blur-sm">
          <div className="bg-popover text-popover-foreground p-4 rounded-xl shadow-2xl flex items-center gap-3">
             <Loader2 className="h-6 w-6 animate-spin text-primary" />
             <span className="font-semibold">Processing Media...</span>
          </div>
        </div>
      )}

      {/* Top Navigation */}
      <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-border bg-background">
        
        {/* LEFT: Branding & Done button */}
        <div className="flex flex-col items-start gap-1 mr-4">
          <span className="text-sm font-semibold gradient-text leading-tight">Editing Template</span>
          <button onClick={handleDone} className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 shadow-sm w-full justify-center">
            <Check className="h-3.5 w-3.5" /> Done
          </button>
        </div>

        {/* MIDDLE: Controls */}
        <div className="flex items-center gap-4 flex-1">
          {/* Template Switcher */}
          <div className="flex items-center gap-2 border-r border-border pr-4 mr-2">
            <LayoutTemplate className="h-4 w-4 text-primary" />
            <select 
              className="bg-transparent border-none text-sm font-semibold cursor-pointer outline-none focus:ring-0 max-w-[140px] truncate"
              onChange={(e) => loadTemplate(e.target.value)}
              defaultValue=""
            >
              <option value="" disabled>Load Template</option>
              {BUILT_IN_TEMPLATES.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          
          <div className="hidden sm:flex items-center bg-muted/50 p-0.5 rounded-md border border-border">
            <button 
              onClick={() => { setViewport("desktop"); closeToolbars(); }}
              className={cn("p-1.5 rounded-sm transition-colors", viewport === "desktop" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
              title="Desktop View"
            ><Monitor className="h-4 w-4" /></button>
            <button 
              onClick={() => { setViewport("mobile"); closeToolbars(); }}
              className={cn("p-1.5 rounded-sm transition-colors", viewport === "mobile" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
              title="Mobile View"
            ><Smartphone className="h-4 w-4" /></button>
          </div>

          {/* Undo / Redo */}
          <div className="flex items-center gap-1 border-l border-border pl-4">
            <button 
              onClick={() => setHistoryIndex(Math.max(0, historyIndex - 1))} 
              disabled={historyIndex === 0}
              className="p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30"
              title="Undo"
            ><Undo className="h-4 w-4" /></button>
            <button 
              onClick={() => setHistoryIndex(Math.min(history.length - 1, historyIndex + 1))} 
              disabled={historyIndex === history.length - 1}
              className="p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30"
              title="Redo"
            ><Redo className="h-4 w-4" /></button>
          </div>
        </div>

        {/* RIGHT: Actions */}
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={insertNewTextBox} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border border-border hover:bg-muted/50">
            <Plus className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Text</span>
          </button>
          <button onClick={() => insertImgRef.current?.click()} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border border-border hover:bg-muted/50">
            <ImageIcon className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Image</span>
          </button>
          <input ref={insertImgRef} type="file" accept="image/*" className="hidden" onChange={insertNewImage} />
          
          <div className="w-px h-5 bg-border mx-1" />
          
          <button onClick={onCancel} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium border border-border hover:bg-muted/50 text-muted-foreground">
            <X className="h-3.5 w-3.5" /> Cancel
          </button>
        </div>
      </div>

      {/* Editing Stage */}
      <div 
        className={cn(
          "flex-1 overflow-auto bg-muted/20 p-4 sm:p-8 flex justify-center transition-colors relative",
          isDraggingOver ? "bg-primary/5" : ""
        )}
        onClick={() => closeToolbars()}
        onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={handleDrop}
      >
        {/* Drop Zone Overlay indicator */}
        {isDraggingOver && (
          <div className="absolute inset-0 z-50 border-4 border-dashed border-primary/50 pointer-events-none rounded-xl m-4 flex items-center justify-center bg-primary/5">
             <div className="bg-background px-6 py-3 rounded-full shadow-lg font-bold text-primary flex items-center gap-2">
                <Upload className="h-5 w-5" /> Drop image here
             </div>
          </div>
        )}

        <div 
          className={cn(
            "bg-background transition-all duration-500 ease-in-out relative origin-top",
            viewport === "mobile" 
              ? "w-full max-w-[375px] min-h-[812px] rounded-[2rem] border-[12px] border-neutral-900 shadow-2xl overflow-hidden" 
              : "w-full max-w-[1200px] min-h-full rounded-xl border border-border shadow-md"
          )}
        >
          {viewport === "mobile" && <div className="absolute top-0 inset-x-0 h-6 bg-neutral-900 rounded-b-xl w-32 mx-auto z-50 pointer-events-none" />}

          <div
            ref={stageRef}
            className={cn("template-inline-stage w-full h-full", viewport === "mobile" ? "pt-8 pb-12 px-2 overflow-x-hidden" : "")}
            onClick={handleStageClick}
          />
        </div>
      </div>

      {/* Floating Text Toolbar */}
      {textToolbar && (
        <div
          className="fixed z-[2147483601] flex flex-wrap items-center gap-1 rounded-lg border border-border bg-popover p-1 shadow-xl max-w-sm"
          style={{ left: textToolbar.left, top: textToolbar.top }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <button onClick={() => exec("bold")} className="p-1.5 rounded hover:bg-muted/50" title="Bold"><Bold className="h-3.5 w-3.5" /></button>
          <button onClick={() => exec("italic")} className="p-1.5 rounded hover:bg-muted/50" title="Italic"><Italic className="h-3.5 w-3.5" /></button>
          <button onClick={() => exec("underline")} className="p-1.5 rounded hover:bg-muted/50" title="Underline"><UnderlineIcon className="h-3.5 w-3.5" /></button>
          <button onClick={applyLink} className="p-1.5 rounded hover:bg-muted/50" title="Link"><LinkIcon className="h-3.5 w-3.5" /></button>
          
          <div className="w-px h-5 bg-border mx-1" />
          
          <button onClick={() => setAlignment("left")} className="p-1.5 rounded hover:bg-muted/50" title="Align Left"><AlignLeft className="h-3.5 w-3.5" /></button>
          <button onClick={() => setAlignment("center")} className="p-1.5 rounded hover:bg-muted/50" title="Align Center"><AlignCenter className="h-3.5 w-3.5" /></button>
          <button onClick={() => setAlignment("right")} className="p-1.5 rounded hover:bg-muted/50" title="Align Right"><AlignRight className="h-3.5 w-3.5" /></button>
          <button onClick={() => exec("insertUnorderedList")} className="p-1.5 rounded hover:bg-muted/50" title="Bullet List"><List className="h-3.5 w-3.5" /></button>
          <button onClick={() => exec("insertOrderedList")} className="p-1.5 rounded hover:bg-muted/50" title="Numbered List"><ListOrdered className="h-3.5 w-3.5" /></button>

          <div className="w-px h-5 bg-border mx-1" />

          <Type className="h-3.5 w-3.5 text-muted-foreground ml-1" />
          <select onChange={(e) => setFontSize(Number(e.target.value))} className="h-7 w-14 rounded border border-border bg-background px-1 text-xs" defaultValue="">
            <option value="" disabled>Size</option>
            {FONT_SIZES.map((s) => <option key={s} value={s}>{s}px</option>)}
          </select>
          
          <Palette className="h-3.5 w-3.5 text-muted-foreground ml-1" />
          <input type="color" onChange={(e) => setColor(e.target.value)} className="h-6 w-6 rounded cursor-pointer bg-transparent border-0 p-0" title="Text color" />
          
          <div className="w-px h-5 bg-border mx-1" />

          <button onClick={() => deleteElement(textToolbar.el)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive" title="Delete Element"><Trash2 className="h-3.5 w-3.5" /></button>
          <button onClick={closeToolbars} className="p-1.5 rounded hover:bg-muted/50 ml-1 bg-muted" title="Done"><Check className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {/* Floating Media Toolbar (Extended for Cropping & Resizing) */}
      {mediaToolbar && (
        <div
          className="fixed z-[2147483601] flex flex-col gap-2 rounded-lg border border-border bg-popover p-2 shadow-2xl min-w-[280px]"
          style={{ left: mediaToolbar.left, top: mediaToolbar.top }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {/* Top Row: File & Actions */}
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground px-1 font-bold">Media</span>
              <button onClick={() => replaceImgRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-muted hover:bg-muted/80 disabled:opacity-50">
                {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />} Replace
              </button>
              <input ref={replaceImgRef} type="file" accept="image/*" className="hidden" onChange={onReplaceImg} />
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => deleteElement(mediaToolbar.el)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive" title="Delete Image"><Trash2 className="h-4 w-4" /></button>
              <button onClick={closeToolbars} className="p-1.5 rounded hover:bg-muted bg-muted/50" title="Close"><X className="h-4 w-4" /></button>
            </div>
          </div>

          {/* Middle Row: Cropping Shapes */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground px-1 w-12">Crop:</span>
            <button onClick={() => applyCrop('auto', '0', 'contain')} className="p-1.5 rounded hover:bg-muted" title="Original Ratio"><Frame className="h-4 w-4" /></button>
            <button onClick={() => applyCrop('1/1', '0', 'cover')} className="p-1.5 rounded hover:bg-muted" title="Square (1:1)"><Square className="h-4 w-4" /></button>
            <button onClick={() => applyCrop('16/9', '0', 'cover')} className="p-1.5 rounded hover:bg-muted" title="Landscape (16:9)"><RectangleHorizontal className="h-4 w-4" /></button>
            <button onClick={() => applyCrop('3/4', '0', 'cover')} className="p-1.5 rounded hover:bg-muted" title="Portrait (3:4)"><RectangleVertical className="h-4 w-4" /></button>
            <button onClick={() => applyCrop('1/1', '50%', 'cover')} className="p-1.5 rounded hover:bg-muted" title="Circle"><Circle className="h-4 w-4" /></button>
          </div>

          {/* Bottom Row: Resizing */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground px-1 w-12">Size:</span>
            <Maximize2 className="h-3 w-3 text-muted-foreground" />
            <input 
              type="range" 
              min="10" 
              max="100" 
              defaultValue={parseInt(mediaToolbar.el.style.width || "100")}
              onChange={(e) => setMediaWidth(e.target.value)}
              className="flex-1 h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary" 
              title="Drag to resize image width"
            />
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}

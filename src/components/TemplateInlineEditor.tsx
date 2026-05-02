import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { 
  Bold, Italic, Underline as UnderlineIcon, Type, Palette, 
  Upload, X, Check, Image as ImageIcon, Loader2, Plus, 
  Monitor, Smartphone, Link as LinkIcon, Trash2, 
  AlignLeft, AlignCenter, AlignRight, List, ListOrdered, Undo, Redo
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { uploadWithSupabaseRetry } from "@/lib/supabase-retry";
import { toast } from "sonner";

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

  // History Stack (Undo/Redo)
  const [history, setHistory] = useState<string[]>([initialHtml]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const replaceImgRef = useRef<HTMLInputElement>(null);
  const replaceVidRef = useRef<HTMLInputElement>(null);
  const insertImgRef = useRef<HTMLInputElement>(null);
  const insertVidRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    if (!stageRef.current) return;
    stageRef.current.innerHTML = history[historyIndex];
  }, [historyIndex]);

  const saveState = useCallback(() => {
    // Use timeout to allow DOM to update before saving
    setTimeout(() => {
      if (!stageRef.current) return;
      const html = stageRef.current.innerHTML;
      setHistory((prev) => {
        const newHistory = prev.slice(0, historyIndex + 1);
        if (newHistory[newHistory.length - 1] === html) return prev; // No change
        newHistory.push(html);
        return newHistory;
      });
      setHistoryIndex((prev) => prev + 1);
    }, 50);
  }, [historyIndex]);

  const closeToolbars = useCallback(() => {
    if (textToolbar) {
      textToolbar.el.removeAttribute("contenteditable");
      textToolbar.el.style.outline = "";
      saveState(); // Save text edits when closing toolbar
    }
    setTextToolbar(null);
    setMediaToolbar(null);
  }, [textToolbar, saveState]);

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
      // Avoid deprecated <font> tags by using a span
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

  // ... (uploadFile, onReplaceImg, onReplaceVid remain the same)
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
      img.style.cssText = mediaToolbar.el.getAttribute("style") || "max-width:100%;height:auto;";
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
    img.style.cssText = "max-width:100%;height:auto;display:block;margin:1rem auto;";
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

  const handleDone = () => {
    closeToolbars(); // Ensures latest text edits are saved and outlines removed
    const html = stageRef.current?.innerHTML || "";
    onDone(html);
  };

  return createPortal(
    <div className="fixed inset-0 z-[2147483600] bg-background flex flex-col">
      {/* Top Navigation */}
      <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-border bg-background">
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold gradient-text">Editing Template</span>
          
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

        <div className="flex items-center gap-2">
          <button onClick={insertNewTextBox} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border border-border hover:bg-muted/50">
            <Plus className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Text</span>
          </button>
          <button onClick={() => insertImgRef.current?.click()} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border border-border hover:bg-muted/50">
            <ImageIcon className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Image</span>
          </button>
          <input ref={insertImgRef} type="file" accept="image/*" className="hidden" onChange={insertNewImage} />
          
          <div className="w-px h-5 bg-border mx-1" />
          
          <button onClick={onCancel} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium border border-border hover:bg-muted/50">
            <X className="h-3.5 w-3.5" /> Cancel
          </button>
          <button onClick={handleDone} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:opacity-90">
            <Check className="h-3.5 w-3.5" /> Done
          </button>
        </div>
      </div>

      {/* Editing Stage */}
      <div className="flex-1 overflow-auto bg-muted/20 p-4 sm:p-8 flex justify-center" onClick={() => closeToolbars()}>
        <div 
          className={cn(
            "bg-white transition-all duration-500 ease-in-out relative origin-top",
            viewport === "mobile" 
              ? "w-full max-w-[375px] min-h-[812px] rounded-[2rem] border-[12px] border-neutral-900 shadow-2xl overflow-hidden" 
              : "w-full max-w-[1200px] min-h-full rounded-xl border border-border shadow-md"
          )}
        >
          {viewport === "mobile" && <div className="absolute top-0 inset-x-0 h-6 bg-neutral-900 rounded-b-xl w-32 mx-auto z-50" />}

          <div
            ref={stageRef}
            className={cn("template-inline-stage w-full h-full text-black", viewport === "mobile" ? "pt-8 pb-12 px-2 overflow-x-hidden" : "")}
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
          {/* Formatting */}
          <button onClick={() => exec("bold")} className="p-1.5 rounded hover:bg-muted/50" title="Bold"><Bold className="h-3.5 w-3.5" /></button>
          <button onClick={() => exec("italic")} className="p-1.5 rounded hover:bg-muted/50" title="Italic"><Italic className="h-3.5 w-3.5" /></button>
          <button onClick={() => exec("underline")} className="p-1.5 rounded hover:bg-muted/50" title="Underline"><UnderlineIcon className="h-3.5 w-3.5" /></button>
          <button onClick={applyLink} className="p-1.5 rounded hover:bg-muted/50" title="Link"><LinkIcon className="h-3.5 w-3.5" /></button>
          
          <div className="w-px h-5 bg-border mx-1" />
          
          {/* Alignment & Lists */}
          <button onClick={() => setAlignment("left")} className="p-1.5 rounded hover:bg-muted/50" title="Align Left"><AlignLeft className="h-3.5 w-3.5" /></button>
          <button onClick={() => setAlignment("center")} className="p-1.5 rounded hover:bg-muted/50" title="Align Center"><AlignCenter className="h-3.5 w-3.5" /></button>
          <button onClick={() => setAlignment("right")} className="p-1.5 rounded hover:bg-muted/50" title="Align Right"><AlignRight className="h-3.5 w-3.5" /></button>
          <button onClick={() => exec("insertUnorderedList")} className="p-1.5 rounded hover:bg-muted/50" title="Bullet List"><List className="h-3.5 w-3.5" /></button>
          <button onClick={() => exec("insertOrderedList")} className="p-1.5 rounded hover:bg-muted/50" title="Numbered List"><ListOrdered className="h-3.5 w-3.5" /></button>

          <div className="w-px h-5 bg-border mx-1" />

          {/* Typography */}
          <Type className="h-3.5 w-3.5 text-muted-foreground ml-1" />
          <select onChange={(e) => setFontSize(Number(e.target.value))} className="h-7 w-14 rounded border border-border bg-background px-1 text-xs" defaultValue="">
            <option value="" disabled>Size</option>
            {FONT_SIZES.map((s) => <option key={s} value={s}>{s}px</option>)}
          </select>
          
          <Palette className="h-3.5 w-3.5 text-muted-foreground ml-1" />
          <input type="color" onChange={(e) => setColor(e.target.value)} className="h-6 w-6 rounded cursor-pointer bg-transparent border-0 p-0" title="Text color" />
          
          <div className="w-px h-5 bg-border mx-1" />

          {/* Actions */}
          <button onClick={() => deleteElement(textToolbar.el)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive" title="Delete Element"><Trash2 className="h-3.5 w-3.5" /></button>
          <button onClick={closeToolbars} className="p-1.5 rounded hover:bg-muted/50 ml-1 bg-muted" title="Done"><Check className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {/* Floating Media Toolbar */}
      {mediaToolbar && (
        <div
          className="fixed z-[2147483601] flex items-center gap-2 rounded-lg border border-border bg-popover p-1.5 shadow-xl"
          style={{ left: mediaToolbar.left, top: mediaToolbar.top }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground px-1">Media</span>
          <button onClick={() => replaceImgRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-muted/50 disabled:opacity-50">
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Replace
          </button>
          <input ref={replaceImgRef} type="file" accept="image/*" className="hidden" onChange={onReplaceImg} />
          
          <div className="w-px h-5 bg-border mx-1" />
          <button onClick={() => deleteElement(mediaToolbar.el)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive" title="Delete Image"><Trash2 className="h-3.5 w-3.5" /></button>
          <button onClick={closeToolbars} className="p-1.5 rounded hover:bg-muted/50 bg-muted" title="Close"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}
    </div>,
    document.body,
  );
}



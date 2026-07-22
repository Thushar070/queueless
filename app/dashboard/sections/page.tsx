"use client";

import { useEffect, useState } from "react";
import { FolderKanban, Plus, Edit2, Trash2, X, AlertCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Section {
  id: string;
  name: string;
}

export default function SectionsPage() {
  const { status } = useSession();
  const router = useRouter();

  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [editName, setEditName] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSections = async (showLoading = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const res = await fetch("/api/sections");
      if (!res.ok) {
        throw new Error("Failed to fetch sections");
      }
      const data = await res.json();
      setSections(data);
      setError(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred while loading sections.";
      setError(message);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    let active = true;
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      const load = async () => {
        try {
          const res = await fetch("/api/sections");
          if (!res.ok) throw new Error("Failed to fetch sections");
          const data = await res.json();
          if (active) {
            setSections(data);
            setError(null);
          }
        } catch (err: unknown) {
          if (active) {
            const message = err instanceof Error ? err.message : "An error occurred while loading sections.";
            setError(message);
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      };
      load();
    }
    return () => {
      active = false;
    };
  }, [status, router]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const body = await res.json();

      if (!res.ok) {
        setError(body.error || "Failed to create section");
        return;
      }

      setName("");
      setIsCreateOpen(false);
      fetchSections();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to connect to the server.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSection || !editName.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/sections/${editingSection.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName }),
      });

      const body = await res.json();

      if (!res.ok) {
        setError(body.error || "Failed to update section");
        return;
      }

      setEditingSection(null);
      setEditName("");
      fetchSections();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to connect to the server.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (sectionId: string) => {
    if (!confirm("Are you sure you want to delete this section? Referenced queues will not be deleted but will have their section category removed.")) {
      return;
    }

    setError(null);
    try {
      const res = await fetch(`/api/sections/${sectionId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to delete section");
      }

      fetchSections();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete section";
      setError(message);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8 select-none text-left">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-heading font-extrabold tracking-tight text-foreground font-heading">Queue Sections</h2>
          <p className="text-muted-foreground text-sm mt-1 font-medium">Create visual category dividers to group your different customer lines.</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-bold px-4 py-2.5 rounded-lg transition-colors cursor-pointer shadow-sm flex items-center gap-1.5 h-fit self-start sm:self-auto"
        >
          <Plus className="size-4" />
          Create Section
        </button>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded-lg flex items-center gap-2 text-left">
          <AlertCircle className="size-5 shrink-0" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-20 flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      ) : sections.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border rounded-2xl p-8">
          <FolderKanban className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-bold text-foreground">No sections configured</h3>
          <p className="text-muted-foreground text-sm mt-1 mb-6">Create sections to organize your queues on the dashboard card list.</p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-xs px-4 py-2.5 rounded-lg transition-colors cursor-pointer inline-block"
          >
            Create Your First Section
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sections.map((section) => (
            <div
              key={section.id}
              className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-foreground">{section.name}</h4>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingSection(section);
                    setEditName(section.name);
                  }}
                  className="bg-card hover:bg-muted border border-border text-foreground text-xs font-bold p-2 rounded-lg transition-colors cursor-pointer"
                  title="Rename"
                >
                  <Edit2 className="size-3.5 text-muted-foreground" />
                </button>
                <button
                  onClick={() => handleDelete(section.id)}
                  className="bg-card hover:bg-destructive/10 text-destructive border border-destructive/20 p-2 rounded-lg transition-colors cursor-pointer"
                  title="Delete"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Section Modal Overlay */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border w-full max-w-sm rounded-2xl p-6 shadow-2xl relative space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-extrabold text-base text-foreground">Create Queue Section</h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-[10px] text-foreground font-bold uppercase tracking-wider block">Section Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="General Registration, Specialized Checkups"
                  className="w-full bg-muted/20 border border-border rounded-lg px-3.5 py-2.5 text-xs text-foreground placeholder-muted-foreground/60 focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-xs py-3 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? "Creating..." : "Save Section"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Section Modal Overlay */}
      {editingSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border w-full max-w-sm rounded-2xl p-6 shadow-2xl relative space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-extrabold text-base text-foreground">Rename Section</h3>
              <button
                onClick={() => setEditingSection(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-[10px] text-foreground font-bold uppercase tracking-wider block">New Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="New section name"
                  className="w-full bg-muted/20 border border-border rounded-lg px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-xs py-3 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

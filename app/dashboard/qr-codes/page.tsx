"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Queue {
  id: string;
  name: string;
  slug: string;
  qrCodeUrl: string | null;
  status: "OPEN" | "CLOSED";
}

export default function QrCodesPage() {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  const fetchQueues = async (showLoading = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const res = await fetch("/api/queues");
      if (!res.ok) {
        throw new Error("Failed to fetch queues");
      }
      const data = await res.json();
      setQueues(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch("/api/queues");
        if (!res.ok) {
          throw new Error("Failed to fetch queues");
        }
        const data = await res.json();
        if (active) {
          setQueues(data);
        }
      } catch (err: unknown) {
        if (active) {
          const message = err instanceof Error ? err.message : "An error occurred";
          setError(message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const regenerateQr = async (queueId: string) => {
    setRegeneratingId(queueId);
    setError(null);
    try {
      const res = await fetch(`/api/queues/${queueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "regenerate-qr" }),
      });

      if (!res.ok) {
        throw new Error("Failed to regenerate QR code");
      }

      await fetchQueues(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
    } finally {
      setRegeneratingId(null);
    }
  };

  return (
    <div className="space-y-8 select-none text-left">
      <div>
        <h2 className="text-3xl font-heading font-extrabold tracking-tight text-foreground font-heading">Queue QR Codes</h2>
        <p className="text-muted-foreground text-sm mt-1 font-medium">Download and print QR codes for customers to join virtual queues instantly</p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded-lg flex items-center gap-2">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      ) : queues.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border rounded-2xl p-8">
          <svg className="w-12 h-12 mx-auto text-muted-foreground mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m0 11v1m5-10v1m0-7H7m0 14h10M4 17h16" />
          </svg>
          <h3 className="text-lg font-bold text-foreground">No queues active</h3>
          <p className="text-muted-foreground text-sm mt-1 mb-6">Create a queue first under the Queues tab to generate QR codes.</p>
          <Link
            href="/dashboard/queues"
            className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-xs px-4 py-2.5 rounded-lg transition-colors cursor-pointer inline-block"
          >
            Go to Queues
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {queues.map((queue) => (
            <div
              key={queue.id}
              className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center justify-between text-center relative overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-muted/30 border-border">
                <span className={`w-1.5 h-1.5 rounded-full ${queue.status === "OPEN" ? "bg-emerald-500" : "bg-amber-500"}`} />
                {queue.status}
              </div>

              <div className="w-full space-y-4">
                <div className="text-left mt-2">
                  <h3 className="font-heading font-extrabold text-lg text-foreground truncate max-w-[150px]">{queue.name}</h3>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">/q/{queue.slug}</p>
                </div>

                {/* QR Image Display */}
                <div className="bg-white p-4 rounded-xl inline-block shadow-inner mx-auto my-2 border border-border">
                  {queue.qrCodeUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={queue.qrCodeUrl}
                      alt={`${queue.name} QR Code`}
                      className="w-40 h-40 select-none object-contain"
                    />
                  ) : (
                    <div className="w-40 h-40 flex items-center justify-center text-muted-foreground text-xs">
                      No QR Code
                    </div>
                  )}
                </div>
              </div>

              {/* Card Action footer */}
              <div className="w-full flex gap-3 mt-6 border-t border-border pt-4">
                {queue.qrCodeUrl && (
                  <a
                    href={queue.qrCodeUrl}
                    download={`${queue.slug}-qr-code.png`}
                    className="flex-1 text-center bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-xs py-2.5 px-3 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </a>
                )}
                <button
                  onClick={() => regenerateQr(queue.id)}
                  disabled={regeneratingId === queue.id}
                  className="bg-card hover:bg-muted border border-border text-foreground text-xs font-bold py-2.5 px-3 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {regeneratingId === queue.id ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-foreground border-t-transparent" />
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 6.308l-2.29 2.29" />
                    </svg>
                  )}
                  Regen
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

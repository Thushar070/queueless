"use client";

import { useState, useRef } from "react";
import { Upload, X, AlertCircle, CheckCircle2, FileSpreadsheet } from "lucide-react";

interface CSVImportProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface ImportDetail {
  row: number;
  name?: string;
  email?: string;
  status: "success" | "error";
  error?: string;
}

interface ImportSummary {
  total: number;
  success: number;
  errors: number;
}

export default function CSVImport({ onClose, onSuccess }: CSVImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [details, setDetails] = useState<ImportDetail[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile.name.endsWith(".csv")) {
        setFile(selectedFile);
        setError(null);
        setSummary(null);
        setDetails([]);
      } else {
        setError("Only CSV files are supported.");
        setFile(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setSummary(null);
    setDetails([]);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/staff/import", {
        method: "POST",
        body: formData,
      });

      const body = await res.json();

      if (!res.ok) {
        setError(body.error || "Failed to import CSV.");
        return;
      }

      setSummary(body.summary);
      setDetails(body.details);
      onSuccess();
    } catch (err) {
      console.error(err);
      setError("An unexpected network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border w-full max-w-lg rounded-2xl p-6 shadow-2xl relative flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2 text-foreground text-left">
            <FileSpreadsheet className="size-5 text-muted-foreground" />
            <div>
              <h3 className="font-heading font-extrabold text-base">Bulk Import Staff</h3>
              <p className="text-[10px] text-muted-foreground">Upload CSV file with &quot;name&quot;, &quot;email&quot;, and &quot;role&quot; columns</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto py-6 space-y-4 pr-1">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs px-4 py-3 rounded-lg flex items-center gap-2 text-left">
              <AlertCircle className="size-4 shrink-0" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {/* Drag/Click Zone */}
          {!summary && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border hover:border-primary/55 rounded-xl p-8 text-center cursor-pointer transition-colors space-y-3 bg-muted/5 group"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv"
                className="hidden"
              />
              <div className="mx-auto size-10 rounded-full bg-muted/40 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Upload className="size-5 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-foreground">
                  {file ? file.name : "Select your CSV file"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {file ? `${(file.size / 1024).toFixed(1)} KB` : "Click to select file from computer"}
                </p>
              </div>
            </div>
          )}

          {/* Summary Dashboard */}
          {summary && (
            <div className="grid grid-cols-3 gap-4 text-center border border-border p-4 rounded-xl bg-muted/5">
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total Rows</p>
                <p className="text-xl font-heading font-extrabold text-foreground mt-0.5">{summary.total}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-emerald-650 tracking-wider">Success</p>
                <p className="text-xl font-heading font-extrabold text-emerald-650 mt-0.5">{summary.success}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-destructive tracking-wider">Failed</p>
                <p className="text-xl font-heading font-extrabold text-destructive mt-0.5">{summary.errors}</p>
              </div>
            </div>
          )}

          {/* Details Table */}
          {details.length > 0 && (
            <div className="border border-border rounded-xl overflow-hidden text-left shrink-0">
              <div className="bg-muted/30 border-b border-border p-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider grid grid-cols-12">
                <span className="col-span-2">Row</span>
                <span className="col-span-4">Email</span>
                <span className="col-span-2">Status</span>
                <span className="col-span-4">Notes / Error</span>
              </div>
              <div className="divide-y divide-border max-h-48 overflow-y-auto text-xs font-medium">
                {details.map((detail, index) => (
                  <div key={index} className="p-2.5 grid grid-cols-12 items-center">
                    <span className="col-span-2 font-mono text-muted-foreground">#{detail.row}</span>
                    <span className="col-span-4 truncate font-semibold" title={detail.email}>
                      {detail.email || "-"}
                    </span>
                    <span className="col-span-2">
                      {detail.status === "success" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-650 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                          <CheckCircle2 className="size-3" />
                          OK
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-destructive bg-destructive/5 px-1.5 py-0.5 rounded border border-destructive/10">
                          <AlertCircle className="size-3" />
                          Err
                        </span>
                      )}
                    </span>
                    <span className="col-span-4 truncate text-muted-foreground text-[11px]" title={detail.error}>
                      {detail.status === "success" ? "Staff Created" : detail.error}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 pt-4 border-t border-border shrink-0">
          <button
            onClick={onClose}
            className="flex-1 bg-card hover:bg-muted border border-border text-foreground text-xs font-bold py-2.5 rounded-lg transition-colors cursor-pointer shadow-sm"
          >
            {summary ? "Done" : "Cancel"}
          </button>
          {!summary && file && (
            <button
              onClick={handleUpload}
              disabled={loading}
              className="flex-grow-[2] bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-bold py-2.5 rounded-lg transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-primary-foreground border-t-transparent" />
                  Importing...
                </>
              ) : (
                "Start Import"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

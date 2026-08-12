import { useMemo, useState } from "react";
import { ArrowRight, Check, Download, Eye, EyeOff, FileText, Loader2, Minus, Plus, RefreshCw, Search, Share2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  classifyMetadataValue,
  exportComparisonToCSV,
  matchesMetadataFilter,
  exportComparisonToJSON,
  normalizeMetadataValue,
  type DifferenceKind,
  type MetadataRecord,
  type MetadataValue,
} from "@shared/metadataComparator";

type ComparisonRow = {
  key: string;
  before: MetadataValue;
  after: MetadataValue;
  kind: DifferenceKind;
};

interface MetadataComparatorProps {
  before: MetadataRecord;
  after: MetadataRecord;
  title?: string;
  compact?: boolean;
}

function displayValue(value: MetadataValue) {
  if (typeof value === "boolean") {
    return (
      <Badge variant={value ? "default" : "secondary"} className="font-mono text-[11px]">
        {value ? "true" : "false"}
      </Badge>
    );
  }
  const text = normalizeMetadataValue(value);
  return (
    <span className={`block whitespace-pre-wrap break-words font-mono text-xs leading-5 ${text === "—" ? "text-muted-foreground/60" : "text-foreground"}`}>
      {text}
    </span>
  );
}

const kindLabels: Record<DifferenceKind, string> = {
  same: "Identique",
  changed: "Modifié",
  added: "Ajouté",
  removed: "Supprimé",
};

const kindClasses: Record<DifferenceKind, string> = {
  same: "border-border bg-card",
  changed: "border-rose-200 bg-rose-50/70 dark:border-rose-900/60 dark:bg-rose-950/30",
  added: "border-cyan-200 bg-cyan-50/70 dark:border-cyan-900/60 dark:bg-cyan-950/30",
  removed: "border-amber-200 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/30",
};

export function MetadataComparator({
  before,
  after,
  title = "Comparaison des métadonnées",
  compact = false,
}: MetadataComparatorProps) {
  const rows = useMemo<ComparisonRow[]>(() => {
    const keys = Array.from(new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])).sort((a, b) => a.localeCompare(b));
    return keys.map((key) => ({ key, before: before?.[key], after: after?.[key], kind: classifyMetadataValue(before?.[key], after?.[key]) }));
  }, [before, after]);

  const [statusFilter, setStatusFilter] = useState<"all" | DifferenceKind>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [differencesOnly, setDifferencesOnly] = useState(compact);

  const counts = useMemo(() => rows.reduce(
    (result, row) => {
      result[row.kind] += 1;
      return result;
    },
    { same: 0, changed: 0, added: 0, removed: 0 } as Record<DifferenceKind, number>,
  ), [rows]);

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    return rows.filter((row) => matchesMetadataFilter({
      field: row.key,
      before: row.before,
      after: row.after,
      status: row.kind,
      statusFilter,
      searchQuery: query,
      differencesOnly,
    }));
  }, [rows, searchQuery, statusFilter, differencesOnly]);

  const [isSharing, setIsSharing] = useState(false);
  const [shareExpiresHours, setShareExpiresHours] = useState<number>(24);
  const shareMutation = trpc.pdf.shareComparisonReport.useMutation();

  const handleShareReport = async () => {
    setIsSharing(true);
    try {
      const json = exportComparisonToJSON(before, after);
      const res = await shareMutation.mutateAsync({
        reportJson: json,
        expiresHours: shareExpiresHours,
      });
      await navigator.clipboard.writeText(res.signedUrl);
      toast.success(`Lien temporaire (${shareExpiresHours === 1 ? "1 heure" : shareExpiresHours === 24 ? "24 heures" : "7 jours"}) copié !`);
    } catch (error) {
      toast.error(`Erreur de partage: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSharing(false);
    }
  };

  if (rows.length === 0) {
    return <Card className="w-full border-dashed"><div className="p-6 text-center text-sm text-muted-foreground">Aucune métadonnée disponible pour effectuer la comparaison.</div></Card>;
  }

  return (
    <Card className="w-full overflow-hidden border border-border shadow-sm">
      <div className={`${compact ? "p-4" : "p-6"} border-b border-border bg-card`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">DIFF / PDF METADATA</p>
            <h3 className="mt-1 text-lg font-semibold text-foreground">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">Lecture côte à côte de l’état source et de l’état traité.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2" aria-label="Résumé des différences">
              <Badge variant="secondary"><Check className="mr-1 h-3 w-3" />{counts.same} identique{counts.same > 1 ? "s" : ""}</Badge>
              {counts.changed > 0 && <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-200"><RefreshCw className="mr-1 h-3 w-3" />{counts.changed} modifié{counts.changed > 1 ? "s" : ""}</Badge>}
              {counts.added > 0 && <Badge className="bg-cyan-100 text-cyan-800 hover:bg-cyan-100 dark:bg-cyan-950/60 dark:text-cyan-200"><Plus className="mr-1 h-3 w-3" />{counts.added} ajouté{counts.added > 1 ? "s" : ""}</Badge>}
              {counts.removed > 0 && <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-200"><Minus className="mr-1 h-3 w-3" />{counts.removed} supprimé{counts.removed > 1 ? "s" : ""}</Badge>}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const json = exportComparisonToJSON(before, after);
                  const blob = new Blob([json], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `pdf_comparison_report_${Date.now()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Export JSON
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const csv = exportComparisonToCSV(before, after);
                  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `pdf_comparison_report_${Date.now()}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <FileText className="mr-1.5 h-3.5 w-3.5" />
                Export CSV
              </Button>
              <div className="flex items-center gap-1.5">
                <select
                  value={shareExpiresHours}
                  onChange={(e) => setShareExpiresHours(Number(e.target.value))}
                  aria-label="Durée de validité du lien de partage"
                  className="h-9 rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value={1}>1 heure</option>
                  <option value={24}>24 heures</option>
                  <option value={168}>7 jours</option>
                </select>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleShareReport}
                  disabled={isSharing}
                >
                  {isSharing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Share2 className="mr-1.5 h-3.5 w-3.5" />}
                  Partager
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-b border-border bg-muted/20 p-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Rechercher un champ ou une valeur…"
            aria-label="Rechercher dans les métadonnées"
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-9 text-sm outline-none transition focus:ring-2 focus:ring-ring"
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Effacer la recherche"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-pressed={differencesOnly}
                onClick={() => setDifferencesOnly((current) => !current)}
                className={`inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors ${differencesOnly ? "border-primary bg-primary/10 text-primary" : "border-input bg-background text-foreground hover:bg-muted"}`}
              >
                {differencesOnly ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {differencesOnly ? "Différences uniquement" : "Tous les champs"}
              </button>
              <label htmlFor="metadata-status-filter" className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">Filtrer</label>
          <select
            id="metadata-status-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "all" | DifferenceKind)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">Tous les statuts ({rows.length})</option>
            <option value="changed">Modifiés ({counts.changed})</option>
            <option value="added">Ajoutés ({counts.added})</option>
            <option value="removed">Supprimés ({counts.removed})</option>
            <option value="same">Identiques ({counts.same})</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-border px-4 py-2 text-xs text-muted-foreground">
        <span>{filteredRows.length} champ{filteredRows.length > 1 ? "s" : ""} affiché{filteredRows.length > 1 ? "s" : ""} sur {rows.length}</span>
        {(statusFilter !== "all" || searchQuery || differencesOnly) && (
          <button type="button" className="font-medium text-primary hover:underline" onClick={() => { setStatusFilter("all"); setSearchQuery(""); setDifferencesOnly(false); }}>
            Réinitialiser les filtres
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 border-b border-border bg-muted/30 text-[11px] font-mono uppercase tracking-[0.12em] text-muted-foreground md:grid-cols-[minmax(130px,0.65fr)_minmax(0,1fr)_32px_minmax(0,1fr)]">
        <div className="hidden border-r border-border px-4 py-3 md:block">Champ</div>
        <div className="px-4 py-3">Avant traitement</div>
        <div className="hidden items-center justify-center md:flex">→</div>
        <div className="px-4 py-3">Après traitement</div>
      </div>

      <div className="divide-y divide-border">
        {filteredRows.map((row) => (
          <div key={row.key} className={`grid grid-cols-1 gap-3 border-l-4 p-4 transition-colors md:grid-cols-[minmax(130px,0.65fr)_minmax(0,1fr)_32px_minmax(0,1fr)] md:items-start ${kindClasses[row.kind]}`}>
            <div className="flex items-center justify-between gap-3 md:block">
              <span className="font-mono text-xs font-semibold text-foreground">{row.key}</span>
              <Badge variant="outline" className="text-[10px] md:mt-2">{kindLabels[row.kind]}</Badge>
            </div>
            <div className="rounded-md border border-border/70 bg-background/75 p-3"><span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground md:hidden">Avant</span>{displayValue(row.before)}</div>
            <div className="hidden items-center justify-center pt-3 text-muted-foreground md:flex"><ArrowRight className="h-4 w-4" /></div>
            <div className="rounded-md border border-border/70 bg-background/75 p-3"><span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground md:hidden">Après</span>{displayValue(row.after)}</div>
          </div>
        ))}
      </div>
      {filteredRows.length === 0 && (
        <div className="p-8 text-center text-sm text-muted-foreground">
          Aucun champ ne correspond aux filtres actuels. Désactivez le mode compact ou modifiez la recherche.
        </div>
      )}
    </Card>
  );
}

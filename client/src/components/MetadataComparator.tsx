import { useMemo } from "react";
import { ArrowRight, Check, Minus, Plus, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  classifyMetadataValue,
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

  const counts = useMemo(() => rows.reduce(
    (result, row) => {
      result[row.kind] += 1;
      return result;
    },
    { same: 0, changed: 0, added: 0, removed: 0 } as Record<DifferenceKind, number>,
  ), [rows]);

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
          <div className="flex flex-wrap gap-2" aria-label="Résumé des différences">
            <Badge variant="secondary"><Check className="mr-1 h-3 w-3" />{counts.same} identique{counts.same > 1 ? "s" : ""}</Badge>
            {counts.changed > 0 && <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-200"><RefreshCw className="mr-1 h-3 w-3" />{counts.changed} modifié{counts.changed > 1 ? "s" : ""}</Badge>}
            {counts.added > 0 && <Badge className="bg-cyan-100 text-cyan-800 hover:bg-cyan-100 dark:bg-cyan-950/60 dark:text-cyan-200"><Plus className="mr-1 h-3 w-3" />{counts.added} ajouté{counts.added > 1 ? "s" : ""}</Badge>}
            {counts.removed > 0 && <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-200"><Minus className="mr-1 h-3 w-3" />{counts.removed} supprimé{counts.removed > 1 ? "s" : ""}</Badge>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 border-b border-border bg-muted/30 text-[11px] font-mono uppercase tracking-[0.12em] text-muted-foreground md:grid-cols-[minmax(130px,0.65fr)_minmax(0,1fr)_32px_minmax(0,1fr)]">
        <div className="hidden border-r border-border px-4 py-3 md:block">Champ</div>
        <div className="px-4 py-3">Avant traitement</div>
        <div className="hidden items-center justify-center md:flex">→</div>
        <div className="px-4 py-3">Après traitement</div>
      </div>

      <div className="divide-y divide-border">
        {rows.map((row) => (
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
    </Card>
  );
}

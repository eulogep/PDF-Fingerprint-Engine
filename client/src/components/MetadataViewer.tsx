import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MetadataViewerProps {
  metadata: Record<string, any>;
  title?: string;
}

export function MetadataViewer({ metadata, title = "Métadonnées" }: MetadataViewerProps) {
  if (!metadata || Object.keys(metadata).length === 0) {
    return null;
  }

  return (
    <Card className="w-full">
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-4 text-foreground">{title}</h3>
        
        <div className="space-y-3">
          {Object.entries(metadata).map(([key, value]) => (
            <div key={key} className="flex items-start justify-between gap-4 pb-3 border-b border-border last:border-b-0">
              <span className="text-sm font-mono text-muted-foreground min-w-fit">
                {key}
              </span>
              <div className="flex-1 text-right">
                {Array.isArray(value) ? (
                  <div className="flex flex-wrap gap-2 justify-end">
                    {value.map((item, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {String(item)}
                      </Badge>
                    ))}
                  </div>
                ) : typeof value === "boolean" ? (
                  <Badge variant={value ? "default" : "secondary"}>
                    {value ? "Oui" : "Non"}
                  </Badge>
                ) : (
                  <span className="text-sm text-foreground break-words">
                    {String(value)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

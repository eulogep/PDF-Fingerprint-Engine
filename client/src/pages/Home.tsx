import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PdfUploader } from "@/components/PdfUploader";
import { MetadataViewer } from "@/components/MetadataViewer";
import { ProfileManager } from "@/components/ProfileManager";
import { trpc } from "@/lib/trpc";
import { Loader2, Download, ShieldCheck, History } from "lucide-react";
import { toast } from "sonner";

export default function Home() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [targetFile, setTargetFile] = useState<File | null>(null);
  const [extractedMetadata, setExtractedMetadata] = useState<any>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isRebuilding, setIsRebuilding] = useState(false);

  const extractSignatureMutation = trpc.pdf.extractSignature.useMutation();
  const rebuildPdfMutation = trpc.pdf.rebuildPdf.useMutation();
  const { data: history, refetch: refetchHistory } = trpc.pdf.getTreatmentHistory.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const uploadFileToS3 = async (file: File): Promise<string> => {
    // Utiliser le stockage S3 via une route de présignature ou FormData direct
    const formData = new FormData();
    formData.append("file", file);

    const uploadResponse = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!uploadResponse.ok) {
      throw new Error("Erreur lors de l'upload du fichier vers le serveur");
    }

    const data = await uploadResponse.json();
    return data.url;
  };

  const handleExtractSignature = async () => {
    if (!sourceFile) {
      toast.error("Veuillez sélectionner un PDF source");
      return;
    }

    setIsExtracting(true);
    try {
      const url = await uploadFileToS3(sourceFile);
      const result = await extractSignatureMutation.mutateAsync({ fileUrl: url });

      setExtractedMetadata(result.metadata);
      toast.success("Empreinte et signature extraites avec succès");
    } catch (error) {
      toast.error(`Erreur: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleRebuildPdf = async () => {
    if (!targetFile || !extractedMetadata) {
      toast.error("Veuillez sélectionner un PDF cible et extraire/charger une signature");
      return;
    }

    setIsRebuilding(true);
    try {
      const url = await uploadFileToS3(targetFile);
      const result = await rebuildPdfMutation.mutateAsync({
        targetFileUrl: url,
        metadata: extractedMetadata,
      });

      toast.success("PDF reconstruit avec succès");
      refetchHistory();

      const link = document.createElement("a");
      link.href = result.fileUrl;
      link.download = `rebuilt_${Date.now()}.pdf`;
      link.click();
    } catch (error) {
      toast.error(`Erreur: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsRebuilding(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-4 bg-background">
        <div className="text-center max-w-lg">
          <div className="inline-flex p-3 bg-accent/10 rounded-full mb-4">
            <ShieldCheck className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-3 tracking-tight">PDF Clone Forensics</h1>
          <p className="text-muted-foreground mb-6">
            Outil professionnel d'analyse d'empreinte technique, de clonage de signatures et de reconstruction de métadonnées PDF.
          </p>
          <Button onClick={startLogin} size="lg" className="font-semibold px-8">
            Se connecter avec Manus
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* En-tête */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-border pb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">PDF Clone Forensics</h1>
            <p className="text-muted-foreground mt-1">
              Analyse d'empreinte et clonage de signature technique pour PDF administratifs
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-mono bg-accent/10 px-3 py-1 rounded-md border border-border">
              {user?.name || user?.email || "Utilisateur"}
            </span>
          </div>
        </div>

        {/* Onglets principaux */}
        <Tabs defaultValue="extract" className="w-full space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
            <TabsTrigger value="extract">Extraction</TabsTrigger>
            <TabsTrigger value="rebuild">Reconstruction</TabsTrigger>
            <TabsTrigger value="profiles">Profils</TabsTrigger>
            <TabsTrigger value="history">Historique</TabsTrigger>
          </TabsList>

          {/* Onglet Extraction */}
          <TabsContent value="extract" className="space-y-6">
            <Card className="p-6 border border-border shadow-sm">
              <h2 className="text-xl font-semibold mb-2">1. Extraction d'Empreinte Source</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Téléchargez un PDF original d'administration pour extraire son empreinte technique exacte (Producer, Creator, polices, versions, dates).
              </p>

              <div className="space-y-6">
                <PdfUploader
                  label="Sélectionner le PDF Source Original"
                  onFileSelected={setSourceFile}
                  disabled={isExtracting}
                />

                <Button
                  onClick={handleExtractSignature}
                  disabled={!sourceFile || isExtracting}
                  size="lg"
                  className="w-full"
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyse de l'empreinte en cours...
                    </>
                  ) : (
                    "Extraire l'Empreinte Technique"
                  )}
                </Button>

                {extractedMetadata && (
                  <MetadataViewer metadata={extractedMetadata} title="Empreinte Technique Extraite" />
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Onglet Reconstruction */}
          <TabsContent value="rebuild" className="space-y-6">
            <Card className="p-6 border border-border shadow-sm">
              <h2 className="text-xl font-semibold mb-2">2. Reconstruction & Greffe de Signature</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Appliquez l'empreinte extraite sur un nouveau fichier PDF cible pour reproduire une structure technique identique.
              </p>

              <div className="space-y-6">
                <PdfUploader
                  label="Sélectionner le PDF Cible à Modifier"
                  onFileSelected={setTargetFile}
                  disabled={isRebuilding}
                />

                {extractedMetadata ? (
                  <MetadataViewer metadata={extractedMetadata} title="Empreinte prête à être greffée" />
                ) : (
                  <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground text-center">
                    Aucune empreinte active. Veuillez d'abord extraire l'empreinte d'un PDF source dans l'onglet Extraction.
                  </div>
                )}

                <Button
                  onClick={handleRebuildPdf}
                  disabled={!targetFile || !extractedMetadata || isRebuilding}
                  size="lg"
                  className="w-full"
                >
                  {isRebuilding ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Reconstruction et nettoyage en cours...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Reconstruire et Télécharger le PDF Fnal
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* Onglet Profils */}
          <TabsContent value="profiles" className="space-y-6">
            <ProfileManager extractedMetadata={extractedMetadata} />
          </TabsContent>

          {/* Onglet Historique */}
          <TabsContent value="history" className="space-y-6">
            <Card className="p-6 border border-border shadow-sm">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Historique des Traitements
              </h2>

              {history && history.length > 0 ? (
                <div className="space-y-4">
                  {history.map((item: any) => (
                    <div key={item.id} className="p-4 rounded-lg border border-border bg-card flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">Traitement #{item.id}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Date : {new Date(item.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Aucun traitement enregistré pour le moment.
                </p>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

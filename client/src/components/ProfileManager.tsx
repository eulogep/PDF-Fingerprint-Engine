import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Trash2, Save, Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface ProfileManagerProps {
  extractedMetadata?: any;
}

export function ProfileManager({ extractedMetadata }: ProfileManagerProps) {
  const [profileName, setProfileName] = useState("");
  const [profileDescription, setProfileDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { data: profiles, isLoading } = trpc.pdf.listProfiles.useQuery();
  const saveProfileMutation = trpc.pdf.saveProfile.useMutation();
  const deleteProfileMutation = trpc.pdf.deleteProfile.useMutation();

  const handleSaveProfile = async () => {
    if (!profileName.trim()) {
      toast.error("Veuillez entrer un nom pour le profil");
      return;
    }

    if (!extractedMetadata) {
      toast.error("Aucune métadonnée extraite à sauvegarder");
      return;
    }

    setIsSaving(true);
    try {
      await saveProfileMutation.mutateAsync({
        name: profileName,
        description: profileDescription,
        producer: extractedMetadata.producer,
        creator: extractedMetadata.creator,
        pdfVersion: extractedMetadata.pdfVersion,
        creationDate: extractedMetadata.creationDate,
        modificationDate: extractedMetadata.modificationDate,
        xmpMetadata: extractedMetadata.xmpToolkit,
        fonts: extractedMetadata.fonts,
        linearized: extractedMetadata.linearized,
      });

      toast.success("Profil sauvegardé avec succès");
      setProfileName("");
      setProfileDescription("");
    } catch (error) {
      toast.error(`Erreur: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProfile = async (profileId: number) => {
    try {
      await deleteProfileMutation.mutateAsync({ profileId });
      toast.success("Profil supprimé");
    } catch (error) {
      toast.error(`Erreur: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Formulaire de création */}
      {extractedMetadata && (
        <Card className="p-6 border-2 border-accent/50">
          <h3 className="text-lg font-semibold mb-4">Créer un Profil</h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">
                Nom du profil
              </label>
              <Input
                placeholder="Ex: Profil Valophis"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                disabled={isSaving}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">
                Description (optionnel)
              </label>
              <Textarea
                placeholder="Description du profil..."
                value={profileDescription}
                onChange={(e) => setProfileDescription(e.target.value)}
                disabled={isSaving}
                rows={3}
              />
            </div>

            <Button
              onClick={handleSaveProfile}
              disabled={isSaving || !profileName}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Sauvegarder le Profil
            </Button>
          </div>
        </Card>
      )}

      {/* Liste des profils */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Profils Sauvegardés</h3>
        
        {isLoading ? (
          <Card className="p-6">
            <p className="text-muted-foreground">Chargement...</p>
          </Card>
        ) : profiles && profiles.length > 0 ? (
          <div className="grid gap-4">
            {profiles.map((profile: any) => (
              <Card key={profile.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground">{profile.name}</h4>
                    {profile.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {profile.description}
                      </p>
                    )}
                    
                    <div className="flex flex-wrap gap-2 mt-3">
                      {profile.producer && (
                        <Badge variant="secondary" className="text-xs">
                          {profile.producer}
                        </Badge>
                      )}
                      {profile.creator && (
                        <Badge variant="secondary" className="text-xs">
                          {profile.creator}
                        </Badge>
                      )}
                      {profile.linearized === 1 && (
                        <Badge variant="outline" className="text-xs">
                          Linéarisé
                        </Badge>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteProfile(profile.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-6">
            <p className="text-muted-foreground text-center">
              Aucun profil sauvegardé. Créez-en un en extrayant une signature.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

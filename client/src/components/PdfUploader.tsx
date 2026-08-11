import { useState, useRef } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface PdfUploaderProps {
  onFileSelected: (file: File) => void;
  label: string;
  accept?: string;
  disabled?: boolean;
}

export function PdfUploader({
  onFileSelected,
  label,
  accept = ".pdf",
  disabled = false,
}: PdfUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === "application/pdf") {
        setSelectedFile(file);
        onFileSelected(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      const file = files[0];
      setSelectedFile(file);
      onFileSelected(file);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Card className="w-full">
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-4 text-foreground">{label}</h3>
        
        {!selectedFile ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? "border-cyan-400 bg-cyan-50 dark:bg-cyan-950"
                : "border-border hover:border-cyan-300"
            } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            onClick={() => !disabled && fileInputRef.current?.click()}
          >
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-sm font-medium text-foreground">
              Déposez un PDF ici ou cliquez pour sélectionner
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Fichiers PDF uniquement
            </p>
          </div>
        ) : (
          <div className="bg-accent/10 border border-accent rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-medium text-foreground text-sm">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled}
        />
      </div>
    </Card>
  );
}

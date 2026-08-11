#!/usr/bin/env python3
"""
Module d'analyse des signatures PDF.
Extrait l'empreinte technique complète d'un PDF : métadonnées, structure, polices.
"""

import subprocess
import json
import re
from typing import Dict, Any, Optional
from pathlib import Path


class PdfAnalyzer:
    """Analyseur de signatures PDF utilisant exiftool et qpdf."""

    def __init__(self, pdf_path: str):
        self.pdf_path = Path(pdf_path)
        if not self.pdf_path.exists():
            raise FileNotFoundError(f"PDF file not found: {pdf_path}")

    def extract_metadata(self) -> Dict[str, Any]:
        """Extrait les métadonnées du PDF avec exiftool."""
        try:
            result = subprocess.run(
                ["exiftool", "-json", str(self.pdf_path)],
                capture_output=True,
                text=True,
                check=True
            )
            data = json.loads(result.stdout)
            return data[0] if data else {}
        except subprocess.CalledProcessError as e:
            print(f"Error extracting metadata: {e.stderr}")
            return {}

    def extract_signature_info(self) -> Dict[str, Any]:
        """Extrait les informations de signature (Producer, Creator, etc)."""
        metadata = self.extract_metadata()
        
        signature_info = {
            "producer": metadata.get("Producer", ""),
            "creator": metadata.get("Creator", ""),
            "pdfVersion": metadata.get("PDF Version", "1.4"),
            "creationDate": metadata.get("Create Date", ""),
            "modificationDate": metadata.get("Modify Date", ""),
            "xmpToolkit": metadata.get("XMP Toolkit", ""),
            "linearized": metadata.get("Linearized", "No") == "Yes",
        }
        
        return signature_info

    def extract_fonts(self) -> list:
        """Extrait les polices utilisées dans le PDF."""
        try:
            result = subprocess.run(
                ["qpdf", "--show-object", "1", str(self.pdf_path)],
                capture_output=True,
                text=True,
                timeout=5
            )
            fonts = re.findall(r'/BaseFont\s*/(\w+)', result.stdout)
            return list(set(fonts))
        except Exception as e:
            print(f"Error extracting fonts: {e}")
            return []

    def get_complete_signature(self) -> Dict[str, Any]:
        """Retourne la signature complète du PDF."""
        return {
            "metadata": self.extract_signature_info(),
            "fonts": self.extract_fonts(),
            "fileInfo": {
                "filename": self.pdf_path.name,
                "size": self.pdf_path.stat().st_size,
            }
        }

    def extract_to_json(self) -> str:
        """Retourne la signature complète en JSON."""
        return json.dumps(self.get_complete_signature(), indent=2, ensure_ascii=False)


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python pdf_analyzer.py <pdf_path>")
        sys.exit(1)
    
    analyzer = PdfAnalyzer(sys.argv[1])
    print(analyzer.extract_to_json())

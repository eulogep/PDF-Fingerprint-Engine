#!/usr/bin/env python3
"""
Module de reconstruction des signatures PDF.
Applique une empreinte technique sur un PDF cible.
"""

import subprocess
import json
from typing import Dict, Any
from pathlib import Path
from datetime import datetime


class PdfRebuilder:
    """Reconstructeur de signatures PDF utilisant qpdf et exiftool."""

    def __init__(self, target_pdf_path: str, output_pdf_path: str):
        self.target_pdf = Path(target_pdf_path)
        self.output_pdf = Path(output_pdf_path)
        
        if not self.target_pdf.exists():
            raise FileNotFoundError(f"Target PDF not found: {target_pdf_path}")

    def rebuild_with_signature(self, signature_metadata: Dict[str, Any]) -> bool:
        """Reconstruit le PDF avec les métadonnées de signature spécifiées."""
        try:
            self._clean_with_qpdf()
            self._inject_metadata(signature_metadata)
            self._linearize()
            return True
        except Exception as e:
            print(f"Error rebuilding PDF: {e}")
            return False

    def _clean_with_qpdf(self) -> None:
        """Nettoie le PDF en reconstruisant sa structure."""
        temp_output = self.output_pdf.with_stem(self.output_pdf.stem + "_temp")
        
        subprocess.run([
            "qpdf", "--empty", "--pages", str(self.target_pdf), "1-z", "--",
            str(temp_output)
        ], check=True)
        
        temp_output.replace(self.output_pdf)

    def _inject_metadata(self, signature_metadata: Dict[str, Any]) -> None:
        """Injecte les métadonnées via exiftool."""
        exiftool_args = ["exiftool", "-all:all=", "-XMPToolkit="]
        
        if producer := signature_metadata.get("producer"):
            exiftool_args.append(f"-Producer={producer}")
        
        if creator := signature_metadata.get("creator"):
            exiftool_args.append(f"-Creator={creator}")
        
        now = datetime.now().strftime("%Y:%m:%d %H:%M:%S")
        creation_date = signature_metadata.get("creationDate", now)
        modification_date = signature_metadata.get("modificationDate", now)
        
        exiftool_args.append(f"-CreateDate={creation_date}")
        exiftool_args.append(f"-ModifyDate={modification_date}")
        
        exiftool_args.extend(["-overwrite_original", str(self.output_pdf)])
        
        subprocess.run(exiftool_args, check=True)

    def _linearize(self) -> None:
        """Linéarise le PDF."""
        temp_output = self.output_pdf.with_stem(self.output_pdf.stem + "_linear")
        
        subprocess.run([
            "qpdf", "--linearize", str(self.output_pdf), str(temp_output)
        ], check=True)
        
        temp_output.replace(self.output_pdf)

    def get_result_info(self) -> Dict[str, Any]:
        return {
            "output_path": str(self.output_pdf),
            "file_size": self.output_pdf.stat().st_size,
            "filename": self.output_pdf.name,
        }


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 4:
        print("Usage: python pdf_rebuilder.py <target_pdf> <output_pdf> <metadata_json>")
        sys.exit(1)
    
    target = sys.argv[1]
    output = sys.argv[2]
    metadata_str = sys.argv[3]
    
    try:
        metadata = json.loads(metadata_str)
        rebuilder = PdfRebuilder(target, output)
        success = rebuilder.rebuild_with_signature(metadata)
        
        if success:
            print(json.dumps(rebuilder.get_result_info(), indent=2))
        else:
            print("Rebuild failed")
            sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

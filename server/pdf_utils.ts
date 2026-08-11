import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execFileAsync = promisify(execFile);

export interface PdfSignatureMetadata {
  producer?: string;
  creator?: string;
  pdfVersion?: string;
  creationDate?: string;
  modificationDate?: string;
  xmpToolkit?: string;
  linearized?: boolean;
  fonts?: string[];
}

export interface ExtractedSignature {
  metadata: PdfSignatureMetadata;
  fonts: string[];
  fileInfo: {
    filename: string;
    size: number;
  };
}

export async function analyzePdfSignature(pdfPath: string): Promise<ExtractedSignature> {
  try {
    const analyzerPath = path.join(process.cwd(), "server", "pdf_analyzer.py");
    const { stdout } = await execFileAsync("python3", [analyzerPath, pdfPath]);
    const signature = JSON.parse(stdout) as ExtractedSignature;
    return signature;
  } catch (error) {
    console.error("Error analyzing PDF signature:", error);
    throw new Error(`Failed to analyze PDF: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function rebuildPdfWithSignature(
  targetPdfPath: string,
  outputPdfPath: string,
  metadata: PdfSignatureMetadata
): Promise<{ outputPath: string; fileSize: number; filename: string }> {
  try {
    const rebuilderPath = path.join(process.cwd(), "server", "pdf_rebuilder.py");
    const metadataJson = JSON.stringify(metadata);
    
    const { stdout } = await execFileAsync("python3", [
      rebuilderPath,
      targetPdfPath,
      outputPdfPath,
      metadataJson,
    ]);
    
    const result = JSON.parse(stdout);
    return result;
  } catch (error) {
    console.error("Error rebuilding PDF:", error);
    throw new Error(`Failed to rebuild PDF: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function createTempPdfFile(): Promise<string> {
  const tempDir = path.join(process.cwd(), ".temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  const tempFile = path.join(tempDir, `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.pdf`);
  return tempFile;
}

export async function cleanupTempFile(filePath: string): Promise<void> {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.warn(`Failed to cleanup temp file ${filePath}:`, error);
  }
}

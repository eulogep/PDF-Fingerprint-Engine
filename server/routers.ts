import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { analyzePdfSignature, rebuildPdfWithSignature, createTempPdfFile, cleanupTempFile } from "./pdf_utils";
import { storageGetSignedUrl, storagePut } from "./storage";
import fs from "fs/promises";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  pdf: router({
    uploadPdf: protectedProcedure
      .input(z.object({
        filename: z.string().min(1).max(255),
        data: z.string().min(1),
        fileSize: z.number().int().positive(),
      }))
      .mutation(async ({ input, ctx }) => {
        const safeFilename = input.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
        const fileBuffer = Buffer.from(input.data, "base64");
        if (fileBuffer.length !== input.fileSize) {
          throw new Error("Le fichier PDF transmis est invalide ou incomplet");
        }
        const uploadResult = await storagePut(`pdf-input/${Date.now()}_${safeFilename}`, fileBuffer, "application/pdf");
        const processingUrl = await storageGetSignedUrl(uploadResult.key);
        const fileRecord = await db.createPdfFile({
          userId: ctx.user.id,
          filename: safeFilename,
          s3Key: uploadResult.key,
          s3Url: uploadResult.url,
          fileType: "input",
          mimeType: "application/pdf",
          fileSize: fileBuffer.length,
        });
        return { fileUrl: uploadResult.url, processingUrl, fileId: Number((fileRecord as any).insertId) || null };
      }),

    extractSignature: protectedProcedure
      .input(z.object({ fileUrl: z.string() }))
      .mutation(async ({ input, ctx }) => {
        try {
          const response = await fetch(input.fileUrl);
          const buffer = await response.arrayBuffer();
          const tempPath = await createTempPdfFile();
          
          await fs.writeFile(tempPath, Buffer.from(buffer));
          const signature = await analyzePdfSignature(tempPath);
          await cleanupTempFile(tempPath);
          
          return signature;
        } catch (error) {
          throw new Error(`Failed to extract signature: ${error instanceof Error ? error.message : String(error)}`);
        }
      }),

    rebuildPdf: protectedProcedure
      .input(z.object({
        targetFileUrl: z.string(),
        metadata: z.record(z.string(), z.any()),
      }))
      .mutation(async ({ input, ctx }) => {
        const startedAt = Date.now();
        let targetPath = "";
        let outputPath = "";
        try {
          targetPath = await createTempPdfFile();
          outputPath = await createTempPdfFile();

          const response = await fetch(input.targetFileUrl);
          if (!response.ok) {
            throw new Error(`Impossible de télécharger le PDF cible (${response.status})`);
          }
          const buffer = await response.arrayBuffer();
          await fs.writeFile(targetPath, Buffer.from(buffer));

          const metadataBefore = await analyzePdfSignature(targetPath);
          await rebuildPdfWithSignature(targetPath, outputPath, input.metadata);
          const metadataAfter = await analyzePdfSignature(outputPath);

          const resultBuffer = await fs.readFile(outputPath);
          const filename = `rebuilt_${Date.now()}.pdf`;
          const uploadResult = await storagePut(`pdf-rebuilt/${filename}`, resultBuffer, "application/pdf");

          const rebuiltFile = await db.createPdfFile({
            userId: ctx.user.id,
            filename,
            s3Key: uploadResult.key,
            s3Url: uploadResult.url,
            fileType: "rebuilt",
            mimeType: "application/pdf",
            fileSize: resultBuffer.length,
          });

          await db.createPdfTreatment({
            userId: ctx.user.id,
            rebuiltFileId: Number((rebuiltFile as any).insertId) || null,
            metadataUsed: JSON.stringify(input.metadata),
            metadataBefore: JSON.stringify(metadataBefore),
            metadataAfter: JSON.stringify(metadataAfter),
            status: "completed",
            processingTimeMs: Date.now() - startedAt,
          });

          return {
            success: true,
            fileUrl: uploadResult.url,
            metadataBefore,
            metadataAfter,
          };
        } catch (error) {
          throw new Error(`Failed to rebuild PDF: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
          if (targetPath) await cleanupTempFile(targetPath);
          if (outputPath) await cleanupTempFile(outputPath);
        }
      }),

    saveProfile: protectedProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        producer: z.string().optional(),
        creator: z.string().optional(),
        pdfVersion: z.string().optional(),
        creationDate: z.string().optional(),
        modificationDate: z.string().optional(),
        xmpMetadata: z.string().optional(),
        fonts: z.array(z.string()).optional(),
        linearized: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await db.createPdfSignature({
          userId: ctx.user.id,
          name: input.name,
          description: input.description || null,
          producer: input.producer || null,
          creator: input.creator || null,
          pdfVersion: input.pdfVersion || null,
          creationDate: input.creationDate || null,
          modificationDate: input.modificationDate || null,
          xmpMetadata: input.xmpMetadata || null,
          fonts: input.fonts ? JSON.stringify(input.fonts) : null,
          linearized: input.linearized ? 1 : 0,
        });
        return { success: true, profileId: (result as any).insertId };
      }),

    listProfiles: protectedProcedure.query(({ ctx }) =>
      db.getPdfSignaturesByUser(ctx.user.id)
    ),

    deleteProfile: protectedProcedure
      .input(z.object({ profileId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const profile = await db.getPdfSignatureById(input.profileId);
        if (!profile || profile.userId !== ctx.user.id) {
          throw new Error("Profile not found or unauthorized");
        }
        await db.deletePdfSignature(input.profileId);
        return { success: true };
      }),

    getTreatmentHistory: protectedProcedure.query(({ ctx }) =>
      db.getPdfTreatmentsByUser(ctx.user.id)
    ),
  }),
});

export type AppRouter = typeof appRouter;

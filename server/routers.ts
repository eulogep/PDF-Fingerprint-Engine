import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { analyzePdfSignature, rebuildPdfWithSignature, createTempPdfFile, cleanupTempFile } from "./pdf_utils";
import { storagePut } from "./storage";
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
        try {
          const targetPath = await createTempPdfFile();
          const outputPath = await createTempPdfFile();
          
          const response = await fetch(input.targetFileUrl);
          const buffer = await response.arrayBuffer();
          await fs.writeFile(targetPath, Buffer.from(buffer));
          
          await rebuildPdfWithSignature(targetPath, outputPath, input.metadata);
          
          const resultBuffer = await fs.readFile(outputPath);
          const uploadResult = await storagePut(
            `pdf-rebuilt/${Date.now()}_rebuilt.pdf`,
            resultBuffer
          );
          
          await db.createPdfFile({
            userId: ctx.user.id,
            filename: `rebuilt_${Date.now()}.pdf`,
            s3Key: uploadResult.key,
            s3Url: uploadResult.url,
            fileType: "rebuilt",
            mimeType: "application/pdf",
            fileSize: resultBuffer.length,
          });
          
          await cleanupTempFile(targetPath);
          await cleanupTempFile(outputPath);
          
          return {
            success: true,
            fileUrl: uploadResult.url,
          };
        } catch (error) {
          throw new Error(`Failed to rebuild PDF: ${error instanceof Error ? error.message : String(error)}`);
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

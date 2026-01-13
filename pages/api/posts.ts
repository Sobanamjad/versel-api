import type { NextApiRequest, NextApiResponse } from "next";
import formidable, { File } from "formidable";
import fs from "fs";
import path from "path";

import { prisma } from "@/lib/prisma";

export const config = {
  api: {
    bodyParser: false,
  },
};

const uploadDir = path.join(process.cwd(), "public/uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // ================= GET =================
    if (req.method === "GET") {
      const posts = await prisma.post.findMany();
      return res.status(200).json(posts);
    }

    // ================= POST =================
    if (req.method === "POST") {
      try {
        const form = formidable({ uploadDir, keepExtensions: true });
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        form.parse(req, async (err, fields, _files) => {
          if (err) {
            console.error('Form parse error:', err);
            return res.status(500).json({ error: err.message });
          }

          const title = Array.isArray(fields.title) ? fields.title[0] : fields.title;
          const description = Array.isArray(fields.description) ? fields.description[0] : fields.description;

          if (!title || !description) {
            return res.status(400).json({ error: "Title and description are required" });
          }

          // Handle file upload
          const fileRaw = _files.image as File | File[] | undefined;
          const file = Array.isArray(fileRaw) ? fileRaw[0] : fileRaw;

          let imagePath = "/placeholder-image.jpg"; // Default placeholder

          if (file && file.originalFilename) {
            try {
              const ext = path.extname(file.originalFilename);
              const filename = `${Date.now()}${ext}`;

              // In Vercel, use /tmp for temporary storage
              const tempDir = process.env.VERCEL ? '/tmp' : uploadDir;
              const tempPath = path.join(tempDir, filename);

              // Ensure temp directory exists
              if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
              }

              // Move file to temp location
              fs.renameSync(file.filepath, tempPath);

              // For Vercel, we'll use a data URL or cloud storage
              // For now, just store the filename (would need cloud storage for production)
              imagePath = `/uploads/${filename}`;
            } catch (uploadError) {
              console.error('File upload error:', uploadError);
              // Continue with placeholder if upload fails
            }
          }

          const post = await prisma.post.create({
            data: {
              title,
              description,
              image: imagePath,
            },
          });

          return res.status(201).json(post);
        });
      } catch (error) {
        console.error('POST error:', error);
        return res.status(500).json({ error: "Server error" });
      }
      return;
    }

    // ================= PUT =================
    if (req.method === "PUT") {
      const form = formidable({ uploadDir, keepExtensions: true });
      form.parse(req, async (err, fields, files) => {
        if (err) return res.status(500).json({ error: err.message });

        const id = Number(fields.id);
        const title = Array.isArray(fields.title) ? fields.title[0] : fields.title;
        const description = Array.isArray(fields.description) ? fields.description[0] : fields.description;

        const fileRaw = files.image as File | File[] | undefined;
        const file: File | undefined = Array.isArray(fileRaw) ? fileRaw[0] : fileRaw;

        const post = await prisma.post.findUnique({ where: { id } });
        if (!post) return res.status(404).json({ error: "Post not found" });

        let imagePath = post.image;

        // Handle file upload for updates
        const updateFileRaw = files.image as File | File[] | undefined;
        const updateFile = Array.isArray(updateFileRaw) ? updateFileRaw[0] : updateFileRaw;

        if (updateFile && updateFile.originalFilename) {
          try {
            const ext = path.extname(updateFile.originalFilename);
            const filename = `${Date.now()}${ext}`;

            // In Vercel, use /tmp for temporary storage
            const tempDir = process.env.VERCEL ? '/tmp' : uploadDir;
            const tempPath = path.join(tempDir, filename);

            // Ensure temp directory exists
            if (!fs.existsSync(tempDir)) {
              fs.mkdirSync(tempDir, { recursive: true });
            }

            // Move file to temp location
            fs.renameSync(updateFile.filepath, tempPath);

            // Clean up old file if it exists
            if (post.image && post.image !== "/placeholder-image.jpg") {
              const oldPath = path.join(process.env.VERCEL ? '/tmp' : process.cwd(), "public", post.image);
              try {
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
              } catch (cleanupError) {
                console.log('Could not clean up old file:', cleanupError);
              }
            }

            imagePath = `/uploads/${filename}`;
          } catch (uploadError) {
            console.error('File upload error:', uploadError);
            // Keep existing image if upload fails
          }
        }

        const updated = await prisma.post.update({
          where: { id },
          data: { title, description, image: imagePath },
        });

        return res.status(200).json(updated);
      });
      return;
    }

    // ================= DELETE =================
    if (req.method === "DELETE") {
      const id = Number(req.query.id);
      const post = await prisma.post.findUnique({ where: { id } });
      if (!post) return res.status(404).json({ error: "Not found" });

      const imgPath = path.join(process.cwd(), "public", post.image);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);

      await prisma.post.delete({ where: { id } });
      return res.json({ success: true });
    }

    res.status(405).end();
  } catch (e: unknown) {
    console.error("API error:", e);
    const message = e instanceof Error ? e.message : "Server error";
    res.status(500).json({ error: message });
  }
}

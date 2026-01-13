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
      const posts = prisma.post.findMany();
      return res.status(200).json(posts);
    }

    // ================= POST =================
    if (req.method === "POST") {
      const form = formidable({ uploadDir, keepExtensions: true });
      form.parse(req, async (err, fields, files) => {
        if (err) return res.status(500).json({ error: err.message });

        const title = Array.isArray(fields.title) ? fields.title[0] : fields.title;
        const description = Array.isArray(fields.description) ? fields.description[0] : fields.description;

        const fileRaw = files.image as File | File[] | undefined;
        const file = Array.isArray(fileRaw) ? fileRaw[0] : fileRaw;

        if (!title || !description || !file) return res.status(400).json({ error: "All fields required" });

        const ext = path.extname(file.originalFilename || "");
        const filename = `${Date.now()}${ext}`;
        const newPath = path.join(uploadDir, filename);
        fs.renameSync(file.filepath, newPath);

        const post = prisma.post.create({
          data: {
            title,
            description,
            image: `/uploads/${filename}`,
          },
        });

        return res.status(201).json(post);
      });
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

        const post = prisma.post.findUnique({ where: { id } });
        if (!post) return res.status(404).json({ error: "Post not found" });

        let imagePath = post.image;
        if (file && file.originalFilename) {
          const oldPath = path.join(process.cwd(), "public", post.image);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);

          const ext = path.extname(file.originalFilename);
          const filename = `${Date.now()}${ext}`;
          const newPath = path.join(uploadDir, filename);
          fs.renameSync(file.filepath, newPath);
          imagePath = `/uploads/${filename}`;
        }

        const updated = prisma.post.update({
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
      const post = prisma.post.findUnique({ where: { id } });
      if (!post) return res.status(404).json({ error: "Not found" });

      const imgPath = path.join(process.cwd(), "public", post.image);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);

      prisma.post.delete({ where: { id } });
      return res.json({ success: true });
    }

    res.status(405).end();
  } catch (e: unknown) {
    console.error("API error:", e);
    const message = e instanceof Error ? e.message : "Server error";
    res.status(500).json({ error: message });
  }
}

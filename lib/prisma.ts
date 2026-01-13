import Database from "better-sqlite3";
import path from "path";

// Database file path
const dbPath = path.join(process.cwd(), "database.db");

// Create database connection
const db = new Database(dbPath);

// Create posts table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    image TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Prepare statements for better performance
const statements = {
  getAllPosts: db.prepare("SELECT * FROM posts ORDER BY createdAt DESC"),
  getPostById: db.prepare("SELECT * FROM posts WHERE id = ?"),
  createPost: db.prepare("INSERT INTO posts (title, description, image) VALUES (?, ?, ?)"),
  updatePost: db.prepare("UPDATE posts SET title = ?, description = ?, image = ? WHERE id = ?"),
  deletePost: db.prepare("DELETE FROM posts WHERE id = ?"),
};

// Database operations
export const prisma = {
  post: {
    findMany: () => statements.getAllPosts.all(),
    findUnique: (args: { where: { id: number } }) =>
      statements.getPostById.get(args.where.id) as any,
    create: (args: { data: { title: string; description: string; image: string } }) => {
      const result = statements.createPost.run(
        args.data.title,
        args.data.description,
        args.data.image
      );
      return { id: result.lastInsertRowid, ...args.data, createdAt: new Date() };
    },
    update: (args: { where: { id: number }; data: { title?: string; description?: string; image?: string } }) => {
      const updates: string[] = [];
      const values: any[] = [];

      if (args.data.title !== undefined) {
        updates.push("title = ?");
        values.push(args.data.title);
      }
      if (args.data.description !== undefined) {
        updates.push("description = ?");
        values.push(args.data.description);
      }
      if (args.data.image !== undefined) {
        updates.push("image = ?");
        values.push(args.data.image);
      }

      if (updates.length > 0) {
        values.push(args.where.id);
        db.prepare(`UPDATE posts SET ${updates.join(", ")} WHERE id = ?`).run(...values);
      }

      return statements.getPostById.get(args.where.id);
    },
    delete: (args: { where: { id: number } }) => {
      statements.deletePost.run(args.where.id);
      return { id: args.where.id };
    },
  },
};

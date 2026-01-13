import initSqlJs from "sql.js";

// Initialize SQLite database
let db: any = null;
let SQL: any = null;

const initializeDatabase = async () => {
  if (!SQL) {
    SQL = await initSqlJs();
  }

  if (!db) {
    // Try to load existing database from a simple in-memory store
    // In a real app, you'd load from a file or cloud storage
    db = new SQL.Database();

    // Create posts table if it doesn't exist
    db.run(`
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        image TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  return db;
};

// Database operations
export const prisma = {
  post: {
    findMany: async () => {
      const database = await initializeDatabase();
      try {
        const result = database.exec("SELECT * FROM posts ORDER BY createdAt DESC");
        if (!result || result.length === 0 || !result[0].values) return [];

        const columns = result[0].columns;
        const values = result[0].values;

        return values.map((row: any[]) => {
          const post: any = {};
          columns.forEach((col: string, index: number) => {
            post[col] = row[index];
          });
          return post;
        });
      } catch (error) {
        console.log('Database query error:', error);
        return [];
      }
    },

    findUnique: async (args: { where: { id: number } }) => {
      const database = await initializeDatabase();
      try {
        const result = database.exec("SELECT * FROM posts WHERE id = ?", [args.where.id]);

        if (!result || result.length === 0 || !result[0].values || result[0].values.length === 0) return null;

        const columns = result[0].columns;
        const values = result[0].values[0];

        const post: any = {};
        columns.forEach((col: string, index: number) => {
          post[col] = values[index];
        });
        return post;
      } catch (error) {
        console.log('Database query error:', error);
        return null;
      }
    },

    create: async (args: { data: { title: string; description: string; image: string } }) => {
      const database = await initializeDatabase();
      database.run(
        "INSERT INTO posts (title, description, image) VALUES (?, ?, ?)",
        [args.data.title, args.data.description, args.data.image]
      );

      // Get the last inserted id
      const result = database.exec("SELECT last_insert_rowid() as id");
      const id = result[0].values[0][0];

      return {
        id,
        ...args.data,
        createdAt: new Date().toISOString()
      };
    },

    update: async (args: { where: { id: number }; data: { title?: string; description?: string; image?: string } }) => {
      const database = await initializeDatabase();

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
        database.run(`UPDATE posts SET ${updates.join(", ")} WHERE id = ?`, values);
      }

      // Return the updated post
      return prisma.post.findUnique(args);
    },

    delete: async (args: { where: { id: number } }) => {
      const database = await initializeDatabase();
      database.run("DELETE FROM posts WHERE id = ?", [args.where.id]);
      return { id: args.where.id };
    },
  },
};

// Simple in-memory storage that works in serverless environments
// Note: Data won't persist between function calls, but CRUD will work
interface Post {
  id: number;
  title: string;
  description: string;
  image: string;
  createdAt: string;
}

const posts: Post[] = [];

export const prisma = {
  post: {
    findMany: async () => posts,

    findUnique: async (args: { where: { id: number } }) =>
      posts.find(p => p.id === args.where.id) || null,

    create: async (args: { data: { title: string; description: string; image: string } }) => {
      const post = {
        id: Date.now(),
        ...args.data,
        createdAt: new Date().toISOString()
      };
      posts.push(post);
      return post;
    },

    update: async (args: { where: { id: number }; data: { title?: string; description?: string; image?: string } }) => {
      const index = posts.findIndex(p => p.id === args.where.id);
      if (index === -1) return null;

      posts[index] = { ...posts[index], ...args.data };
      return posts[index];
    },

    delete: async (args: { where: { id: number } }) => {
      const index = posts.findIndex(p => p.id === args.where.id);
      if (index === -1) return null;

      const deleted = posts.splice(index, 1)[0];
      return deleted;
    },
  },
};

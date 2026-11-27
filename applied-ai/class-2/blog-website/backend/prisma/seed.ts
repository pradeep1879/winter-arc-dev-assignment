import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma.js";

async function main() {
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();

  const user = await prisma.user.create({
    data: { name: "Demo User", email: "demo@example.com", password: await bcrypt.hash("password123", 10) },
  });

  await prisma.post.createMany({
    data: [
      { title: "Welcome to the Blog", slug: "welcome-to-the-blog", content: "This is the first post on our brand new blog. Register an account and start writing!", authorId: user.id },
      { title: "Getting Started with Prisma 7", slug: "getting-started-with-prisma-7", content: "Prisma 7 introduces prisma.config.ts, driver adapters and the new prisma-client generator.", authorId: user.id },
    ],
  });
  console.log("Seeded. Login: demo@example.com / password123");
}

main().finally(() => prisma.$disconnect());

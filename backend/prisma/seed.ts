import { PrismaClient, Role, TaskStatus, TaskPriority } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function hashed(pw: string) {
  return bcrypt.hash(pw, 10);
}

async function main() {
  console.log("Seeding...");

  const password = await hashed("Password123!");

  const admin = await prisma.user.create({
    data: { email: "admin@example.com", name: "Jeeva Admin", password, role: Role.ADMIN },
  });

  const pm1 = await prisma.user.create({
    data: { email: "pm1@example.com", name: "Anu PM", password, role: Role.PM },
  });
  const pm2 = await prisma.user.create({
    data: { email: "pm2@example.com", name: "Priya PM", password, role: Role.PM },
  });

  const devs = await Promise.all(
    ["Dhana Dev", "Deepak Dev", "Abi Dev", "Barsha Dev"].map((name, i) =>
      prisma.user.create({
        data: { email: `dev${i + 1}@example.com`, name, password, role: Role.DEVELOPER },
      })
    )
  );

  const client1 = await prisma.client.create({ data: { name: "Acme Corp", email: "contact@acme.com" } });
  const client2 = await prisma.client.create({ data: { name: "Globex Inc", email: "hello@globex.com" } });

  const projects = await Promise.all([
    prisma.project.create({ data: { name: "Website Revamp", clientId: client1.id, creatorId: pm1.id } }),
    prisma.project.create({ data: { name: "Mobile App", clientId: client1.id, creatorId: pm1.id } }),
    prisma.project.create({ data: { name: "Internal Tooling", clientId: client2.id, creatorId: pm2.id } }),
  ]);

  const statuses = [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.IN_REVIEW, TaskStatus.DONE];
  const priorities = [TaskPriority.LOW, TaskPriority.MEDIUM, TaskPriority.HIGH, TaskPriority.CRITICAL];

  let overdueCreated = 0;

  for (const project of projects) {
    for (let i = 0; i < 6; i++) {
      const dev = devs[(i + projects.indexOf(project)) % devs.length];
      const makeOverdue = overdueCreated < 2 && i < 2;
      const dueDate = makeOverdue
        ? new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days in the past
        : new Date(Date.now() + (i + 1) * 2 * 24 * 60 * 60 * 1000);

      const task = await prisma.task.create({
        data: {
          title: `${project.name} - Task ${i + 1}`,
          projectId: project.id,
          assigneeId: dev.id,
          status: makeOverdue ? TaskStatus.OVERDUE : statuses[i % statuses.length],
          priority: priorities[i % priorities.length],
          dueDate,
        },
      });

      if (makeOverdue) overdueCreated++;

      // Existing activity history for each seeded task.
      await prisma.activityLog.create({
        data: {
          taskId: task.id,
          projectId: project.id,
          actorId: pm1.id === project.creatorId ? pm1.id : pm2.id,
          previousStatus: null,
          newStatus: TaskStatus.TODO,
        },
      });
      if (task.status !== TaskStatus.TODO) {
        await prisma.activityLog.create({
          data: {
            taskId: task.id,
            projectId: project.id,
            actorId: dev.id,
            previousStatus: TaskStatus.TODO,
            newStatus: task.status,
          },
        });
      }
    }
  }

  console.log("Seed complete.");
  console.log("Login with any seeded user + password: Password123!");
  console.log("  admin@example.com / pm1@example.com / pm2@example.com / dev1..dev4@example.com");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

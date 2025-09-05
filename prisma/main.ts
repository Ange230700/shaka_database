// prisma/main.ts
import { runSeed } from "shakadb/helpers";
import { seed } from "shakadb/seed";
import prisma from "shakadb/lib/client";

async function main() {
  await runSeed(seed, "database seed");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

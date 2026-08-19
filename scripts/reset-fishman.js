const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const warung = await prisma.warung.findFirst({
    where: { nama: { contains: 'fishman', mode: 'insensitive' } },
  });
  
  if (!warung) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Set today's penjemputan to 2 days ago
  const updated = await prisma.penjemputan.updateMany({
    where: {
      warungId: warung.id,
      dibuatAt: { gte: today }
    },
    data: {
      dibuatAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    }
  });
  
  console.log("Moved today's penjemputan to 2 days ago:", updated.count);
}

main().catch(console.error).finally(() => prisma.$disconnect());

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const warung = await prisma.warung.findFirst({
    where: { nama: { contains: 'fishman', mode: 'insensitive' } },
  });
  
  if (!warung) return;

  const deleted = await prisma.permintaanJemput.deleteMany({
    where: {
      warungId: warung.id,
      status: 'BARU'
    }
  });
  
  console.log("Deleted pending requests for fishman:", deleted.count);
}

main().catch(console.error).finally(() => prisma.$disconnect());

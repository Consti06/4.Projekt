import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing in environment variables.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const products = [
  {
    slug: "sunset-over-old-harbor",
    title: "Sunset Over Old Harbor",
    description:
      "Original acrylic painting featuring warm sunset tones over a quiet harbor.",
    price: 420,
    stock: 1,
    medium: "Acrylic on canvas",
    widthCm: 60,
    heightCm: 50,
    yearCreated: 2026,
    isPublished: true,
    images: [
      {
        url: "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9",
        alt: "Sunset Over Old Harbor painting",
        position: 0,
      },
    ],
  },
  {
    slug: "quiet-forest-light",
    title: "Quiet Forest Light",
    description:
      "Original oil painting of a forest path with soft morning light and rich textures.",
    price: 560,
    stock: 1,
    medium: "Oil on canvas",
    widthCm: 70,
    heightCm: 50,
    yearCreated: 2026,
    isPublished: true,
    images: [
      {
        url: "https://images.unsplash.com/photo-1448375240586-882707db888b",
        alt: "Quiet Forest Light painting",
        position: 0,
      },
    ],
  },
];

async function main() {
  for (const product of products) {
    const { images, ...productData } = product;

    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        ...productData,
        images: {
          deleteMany: {},
          create: images,
        },
      },
      create: {
        ...productData,
        images: {
          create: images,
        },
      },
    });
  }

  console.log(`Seeded ${products.length} products.`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

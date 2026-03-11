import { prisma } from "@/lib/prisma";
import { StorefrontClient } from "@/app/components/storefront-client";

export default async function Home() {
  const products = await prisma.product.findMany({
    where: { isPublished: true },
    include: {
      images: {
        orderBy: { position: "asc" },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const storefrontProducts = products.map((product) => ({
    id: product.id,
    title: product.title,
    description: product.description,
    price: Number(product.price),
    currency: product.currency || "USD",
    stock: product.stock,
    heroImage: product.images[0]?.url || null,
    heroImageAlt: product.images[0]?.alt || product.title,
  }));

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_10%,#f2c6a6_0%,transparent_30%),radial-gradient(circle_at_90%_0%,#d4dfd8_0%,transparent_35%),linear-gradient(180deg,#f8f4ee_0%,#efe7dc_100%)]">
      <main className="mx-auto max-w-6xl px-6 py-10 sm:px-10">
        <section className="mb-10 rounded-3xl border border-black/10 bg-white/70 p-8 backdrop-blur-sm">
          <p className="mb-3 text-xs tracking-[0.2em] text-stone-600 uppercase">
            Original Handmade Artworks
          </p>
          <h1 className="max-w-3xl text-4xl leading-tight font-semibold text-stone-900 sm:text-5xl">
            4.Projekt Art Gallery
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-stone-700">
            Browse and buy one-of-one paintings made in real life. Every piece
            is original and ships with care from the artist&apos;s studio.
          </p>
        </section>

        <StorefrontClient products={storefrontProducts} />
      </main>
    </div>
  );
}

import Image from "next/image";

import { ConfirmSubmitButton } from "@/app/admin/components/confirm-submit-button";
import { AdminNav } from "@/app/admin/components/admin-nav";
import {
  createProduct,
  deleteProduct,
  updateProduct,
} from "@/app/admin/products/actions";
import { ProductImagesField } from "@/app/admin/products/product-images-field";
import { requireAdminPage } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function formRowClass(): string {
  return "rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none ring-stone-300 focus:ring";
}

function boolInputClass(): string {
  return "h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-400";
}

function formatTextareaImages(
  images: Array<{ url: string; alt: string | null }>,
): string {
  return images.map((image) => `${image.url}|${image.alt || ""}`).join("\n");
}

function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdminPage("/admin/products");

  const resolved = await searchParams;
  const status = first(resolved.status);
  const error = first(resolved.error);
  const query = first(resolved.q)?.trim() || "";
  const visibility = first(resolved.visibility) || "all";

  const products = await prisma.product.findMany({
    where: {
      ...(query
        ? {
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { slug: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(visibility === "published"
        ? { isPublished: true }
        : visibility === "draft"
          ? { isPublished: false }
          : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      images: {
        orderBy: { position: "asc" },
      },
    },
  });

  const productStats = await prisma.product.groupBy({
    by: ["isPublished"],
    _count: true,
  });
  const publishedCount =
    productStats.find((item) => item.isPublished)?._count ?? 0;
  const draftCount =
    productStats.find((item) => !item.isPublished)?._count ?? 0;

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10 sm:px-10">
      <h1 className="text-3xl font-semibold text-stone-900">Admin Products</h1>
      <p className="mt-2 text-sm text-stone-700">
        Create, edit, publish, and remove artworks from the storefront.
      </p>

      <AdminNav current="products" />

      {status ? (
        <p className="mt-6 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Product {status}.
        </p>
      ) : null}
      {error ? (
        <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-stone-500">
            Total
          </p>
          <p className="mt-2 text-3xl font-semibold text-stone-900">
            {publishedCount + draftCount}
          </p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-stone-500">
            Published
          </p>
          <p className="mt-2 text-3xl font-semibold text-stone-900">
            {publishedCount}
          </p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-stone-500">
            Drafts
          </p>
          <p className="mt-2 text-3xl font-semibold text-stone-900">
            {draftCount}
          </p>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-stone-900">Add New Product</h2>
        <p className="mt-1 text-sm text-stone-700">
          Upload images directly or paste URLs manually. Format is one line per
          image, `url|alt text`.
        </p>

        <form action={createProduct} className="mt-5 grid gap-4 md:grid-cols-2">
          <input name="title" placeholder="Title" required className={formRowClass()} />
          <input name="slug" placeholder="slug-name" required className={formRowClass()} />
          <input
            name="price"
            type="number"
            min="0"
            step="0.01"
            placeholder="Price"
            required
            className={formRowClass()}
          />
          <input
            name="stock"
            type="number"
            min="0"
            step="1"
            defaultValue="1"
            className={formRowClass()}
          />
          <input name="medium" placeholder="Medium" className={formRowClass()} />
          <input
            name="yearCreated"
            type="number"
            min="0"
            step="1"
            placeholder="Year created"
            className={formRowClass()}
          />
          <input
            name="widthCm"
            type="number"
            min="0"
            step="0.01"
            placeholder="Width (cm)"
            className={formRowClass()}
          />
          <input
            name="heightCm"
            type="number"
            min="0"
            step="0.01"
            placeholder="Height (cm)"
            className={formRowClass()}
          />
          <input
            name="depthCm"
            type="number"
            min="0"
            step="0.01"
            placeholder="Depth (cm)"
            className={formRowClass()}
          />
          <div className="flex flex-wrap gap-4 rounded-xl border border-stone-300 px-4 py-3 text-sm text-stone-800">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="isPublished" className={boolInputClass()} />
              Published
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="isOriginal"
                defaultChecked
                className={boolInputClass()}
              />
              Original
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="certificateCoa"
                defaultChecked
                className={boolInputClass()}
              />
              COA included
            </label>
          </div>
          <textarea
            name="description"
            placeholder="Description"
            required
            rows={5}
            className={`md:col-span-2 ${formRowClass()}`}
          />
          <ProductImagesField
            name="images"
            placeholder="https://...|Front view"
            rows={4}
            className={formRowClass()}
          />
          <button
            type="submit"
            className="rounded-xl bg-stone-900 px-4 py-3 text-sm font-medium text-stone-100 transition hover:bg-stone-700 md:col-span-2"
          >
            Create product
          </button>
        </form>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-stone-900">Existing Products</h2>
          <p className="text-sm text-stone-700">{products.length} total</p>
        </div>

        <form className="mb-6 grid gap-3 rounded-2xl border border-black/10 bg-white p-4 shadow-sm md:grid-cols-[1fr_180px_auto]">
          <input
            name="q"
            defaultValue={query}
            placeholder="Search title, slug, description"
            className={formRowClass()}
          />
          <select
            name="visibility"
            defaultValue={visibility}
            className={formRowClass()}
          >
            <option value="all">All products</option>
            <option value="published">Published only</option>
            <option value="draft">Drafts only</option>
          </select>
          <button
            type="submit"
            className="rounded-xl border border-stone-300 px-4 py-2 text-sm text-stone-800 transition hover:bg-stone-100"
          >
            Filter
          </button>
        </form>

        {products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-400/60 p-6 text-sm text-stone-700">
            No products yet.
          </div>
        ) : (
          <div className="space-y-6">
            {products.map((product) => (
              <article
                key={product.id}
                className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm"
              >
                <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
                  <div>
                    <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-stone-200">
                      {product.images[0]?.url ? (
                        <Image
                          src={product.images[0].url}
                          alt={product.images[0].alt || product.title}
                          fill
                          className="object-cover"
                          sizes="220px"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-stone-600">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-stone-900 px-3 py-1 text-stone-100">
                        {product.isPublished ? "Published" : "Draft"}
                      </span>
                      <span className="rounded-full bg-stone-200 px-3 py-1 text-stone-800">
                        Stock {product.stock}
                      </span>
                      <span className="rounded-full bg-stone-200 px-3 py-1 text-stone-800">
                        {formatMoney(Number(product.price), product.currency)}
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-stone-600">
                      Updated {product.updatedAt.toLocaleString("de-AT")}
                    </p>
                  </div>

                  <div>
                    <form action={updateProduct} className="grid gap-4 md:grid-cols-2">
                      <input type="hidden" name="productId" value={product.id} />
                      <input
                        name="title"
                        defaultValue={product.title}
                        required
                        className={formRowClass()}
                      />
                      <input
                        name="slug"
                        defaultValue={product.slug}
                        required
                        className={formRowClass()}
                      />
                      <input
                        name="price"
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={Number(product.price)}
                        required
                        className={formRowClass()}
                      />
                      <input
                        name="stock"
                        type="number"
                        min="0"
                        step="1"
                        defaultValue={product.stock}
                        className={formRowClass()}
                      />
                      <input
                        name="medium"
                        defaultValue={product.medium || ""}
                        className={formRowClass()}
                      />
                      <input
                        name="yearCreated"
                        type="number"
                        min="0"
                        step="1"
                        defaultValue={product.yearCreated || ""}
                        className={formRowClass()}
                      />
                      <input
                        name="widthCm"
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={product.widthCm ? Number(product.widthCm) : ""}
                        className={formRowClass()}
                      />
                      <input
                        name="heightCm"
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={product.heightCm ? Number(product.heightCm) : ""}
                        className={formRowClass()}
                      />
                      <input
                        name="depthCm"
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={product.depthCm ? Number(product.depthCm) : ""}
                        className={formRowClass()}
                      />
                      <div className="flex flex-wrap gap-4 rounded-xl border border-stone-300 px-4 py-3 text-sm text-stone-800">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            name="isPublished"
                            defaultChecked={product.isPublished}
                            className={boolInputClass()}
                          />
                          Published
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            name="isOriginal"
                            defaultChecked={product.isOriginal}
                            className={boolInputClass()}
                          />
                          Original
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            name="certificateCoa"
                            defaultChecked={product.certificateCoa}
                            className={boolInputClass()}
                          />
                          COA included
                        </label>
                      </div>
                      <textarea
                        name="description"
                        defaultValue={product.description}
                        rows={5}
                        required
                        className={`md:col-span-2 ${formRowClass()}`}
                      />
                      <ProductImagesField
                        name="images"
                        defaultValue={formatTextareaImages(product.images)}
                        placeholder="https://...|Front view"
                        rows={4}
                        className={formRowClass()}
                      />
                      <div className="flex flex-wrap gap-3 md:col-span-2">
                        <button
                          type="submit"
                          className="rounded-xl bg-stone-900 px-4 py-3 text-sm font-medium text-stone-100 transition hover:bg-stone-700"
                        >
                          Save changes
                        </button>
                      </div>
                    </form>

                    <form action={deleteProduct} className="mt-3">
                      <input type="hidden" name="productId" value={product.id} />
                      <ConfirmSubmitButton
                        confirmMessage={`Delete "${product.title}"? This cannot be undone.`}
                        className="text-sm text-red-700 underline underline-offset-2"
                      >
                        Delete product
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

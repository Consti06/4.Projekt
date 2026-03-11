"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminAction } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";

function cleanString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseNumberField(value: FormDataEntryValue | null): number | undefined {
  const cleaned = cleanString(value);
  if (!cleaned) {
    return undefined;
  }

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseIntegerField(value: FormDataEntryValue | null): number | undefined {
  const parsed = parseNumberField(value);
  return parsed === undefined ? undefined : Math.trunc(parsed);
}

function parseCheckbox(value: FormDataEntryValue | null): boolean {
  return value === "on";
}

function parseImages(raw: string, title: string) {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [urlPart, altPart] = line.split("|");
      return {
        url: urlPart.trim(),
        alt: altPart?.trim() || title,
        position: index,
      };
    })
    .filter((image) => image.url.length > 0);
}

function redirectWithStatus(status: string): never {
  redirect(`/admin/products?status=${encodeURIComponent(status)}`);
}

function redirectWithError(error: string): never {
  redirect(`/admin/products?error=${encodeURIComponent(error)}`);
}

export async function createProduct(formData: FormData): Promise<void> {
  await requireAdminAction();

  const title = cleanString(formData.get("title"));
  const slug = cleanString(formData.get("slug"));
  const description = cleanString(formData.get("description"));
  const images = parseImages(cleanString(formData.get("images")), title);
  const price = parseNumberField(formData.get("price"));
  const stock = parseIntegerField(formData.get("stock")) ?? 1;

  if (!title || !slug || !description) {
    redirectWithError("Title, slug, and description are required.");
  }

  if (price === undefined || price <= 0) {
    redirectWithError("Price must be a positive number.");
  }

  try {
    await prisma.product.create({
      data: {
        title,
        slug,
        description,
        price,
        stock,
        medium: cleanString(formData.get("medium")) || null,
        widthCm: parseNumberField(formData.get("widthCm")),
        heightCm: parseNumberField(formData.get("heightCm")),
        depthCm: parseNumberField(formData.get("depthCm")),
        yearCreated: parseIntegerField(formData.get("yearCreated")),
        isPublished: parseCheckbox(formData.get("isPublished")),
        isOriginal: !formData.has("isOriginal") || parseCheckbox(formData.get("isOriginal")),
        certificateCoa:
          !formData.has("certificateCoa") ||
          parseCheckbox(formData.get("certificateCoa")),
        images: images.length
          ? {
              create: images,
            }
          : undefined,
      },
    });
  } catch (error) {
    redirectWithError(
      error instanceof Error ? error.message : "Failed to create product.",
    );
  }

  revalidatePath("/");
  revalidatePath("/admin/products");
  redirectWithStatus("created");
}

export async function updateProduct(formData: FormData): Promise<void> {
  await requireAdminAction();

  const productId = cleanString(formData.get("productId"));
  const title = cleanString(formData.get("title"));
  const slug = cleanString(formData.get("slug"));
  const description = cleanString(formData.get("description"));
  const images = parseImages(cleanString(formData.get("images")), title);
  const price = parseNumberField(formData.get("price"));
  const stock = parseIntegerField(formData.get("stock")) ?? 1;

  if (!productId || !title || !slug || !description) {
    redirectWithError("Product id, title, slug, and description are required.");
  }

  if (price === undefined || price <= 0) {
    redirectWithError("Price must be a positive number.");
  }

  try {
    await prisma.product.update({
      where: { id: productId },
      data: {
        title,
        slug,
        description,
        price,
        stock,
        medium: cleanString(formData.get("medium")) || null,
        widthCm: parseNumberField(formData.get("widthCm")),
        heightCm: parseNumberField(formData.get("heightCm")),
        depthCm: parseNumberField(formData.get("depthCm")),
        yearCreated: parseIntegerField(formData.get("yearCreated")),
        isPublished: parseCheckbox(formData.get("isPublished")),
        isOriginal: parseCheckbox(formData.get("isOriginal")),
        certificateCoa: parseCheckbox(formData.get("certificateCoa")),
        images: {
          deleteMany: {},
          create: images,
        },
      },
    });
  } catch (error) {
    redirectWithError(
      error instanceof Error ? error.message : "Failed to update product.",
    );
  }

  revalidatePath("/");
  revalidatePath("/admin/products");
  redirectWithStatus("saved");
}

export async function deleteProduct(formData: FormData): Promise<void> {
  await requireAdminAction();

  const productId = cleanString(formData.get("productId"));
  if (!productId) {
    redirectWithError("Missing product id.");
  }

  try {
    await prisma.product.delete({
      where: { id: productId },
    });
  } catch (error) {
    redirectWithError(
      error instanceof Error ? error.message : "Failed to delete product.",
    );
  }

  revalidatePath("/");
  revalidatePath("/admin/products");
  redirectWithStatus("deleted");
}

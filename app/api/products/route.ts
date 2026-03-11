import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

type ProductImageInput = {
  url: string;
  alt?: string;
  position?: number;
};

type ProductCreateInput = {
  slug: string;
  title: string;
  description: string;
  price: number;
  stock?: number;
  medium?: string;
  widthCm?: number;
  heightCm?: number;
  depthCm?: number;
  yearCreated?: number;
  isPublished?: boolean;
  isOriginal?: boolean;
  certificateCoa?: boolean;
  images?: ProductImageInput[];
};

function parseNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isAdmin(request: NextRequest): boolean {
  const configuredKey = process.env.ADMIN_API_KEY;
  const providedKey = request.headers.get("x-admin-key");

  if (!configuredKey || !providedKey) {
    return false;
  }

  return providedKey === configuredKey;
}

export async function GET() {
  const products = await prisma.product.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: "desc" },
    include: {
      images: {
        orderBy: { position: "asc" },
      },
    },
  });

  return NextResponse.json(products);
}

export async function POST(request: NextRequest) {
  if (!process.env.ADMIN_API_KEY) {
    return NextResponse.json(
      { error: "ADMIN_API_KEY is not configured in .env." },
      { status: 500 },
    );
  }

  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: ProductCreateInput;
  try {
    body = (await request.json()) as ProductCreateInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.slug || !body.title || !body.description) {
    return NextResponse.json(
      { error: "slug, title, and description are required." },
      { status: 400 },
    );
  }

  const price = parseNumber(body.price);
  if (!price || price <= 0) {
    return NextResponse.json(
      { error: "price must be a positive number." },
      { status: 400 },
    );
  }

  try {
    const product = await prisma.product.create({
      data: {
        slug: body.slug,
        title: body.title,
        description: body.description,
        price,
        stock: body.stock ?? 1,
        medium: body.medium,
        widthCm: parseNumber(body.widthCm),
        heightCm: parseNumber(body.heightCm),
        depthCm: parseNumber(body.depthCm),
        yearCreated: body.yearCreated,
        isPublished: body.isPublished ?? false,
        isOriginal: body.isOriginal ?? true,
        certificateCoa: body.certificateCoa ?? true,
        images: body.images?.length
          ? {
              create: body.images.map((image, index) => ({
                url: image.url,
                alt: image.alt ?? body.title,
                position: image.position ?? index,
              })),
            }
          : undefined,
      },
      include: {
        images: {
          orderBy: { position: "asc" },
        },
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to create product.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

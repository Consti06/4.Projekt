import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

type CartItemInput = {
  productId: string;
  quantity: number;
};

type CheckoutBody = {
  cartItems: CartItemInput[];
  customerEmail?: string;
};

const APP_URL = process.env.APP_URL || "http://localhost:3000";
const DEFAULT_ALLOWED_COUNTRIES = [
  "AT",
  "DE",
  "CH",
  "US",
  "NL",
  "BE",
  "FR",
  "IT",
  "ES",
  "PL",
  "CZ",
];

function getAllowedShippingCountries(): string[] {
  const fromEnv = process.env.SHIPPING_ALLOWED_COUNTRIES;
  if (!fromEnv) {
    return DEFAULT_ALLOWED_COUNTRIES;
  }

  const parsed = fromEnv
    .split(",")
    .map((code) => code.trim().toUpperCase())
    .filter((code) => /^[A-Z]{2}$/.test(code));

  return parsed.length ? parsed : DEFAULT_ALLOWED_COUNTRIES;
}

export async function POST(request: NextRequest) {
  let body: CheckoutBody;

  try {
    body = (await request.json()) as CheckoutBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.cartItems?.length) {
    return NextResponse.json(
      { error: "cartItems is required." },
      { status: 400 },
    );
  }

  const normalizedCart = body.cartItems
    .map((item) => ({
      productId: String(item.productId),
      quantity: Number(item.quantity || 0),
    }))
    .filter((item) => item.productId && item.quantity > 0);

  if (!normalizedCart.length) {
    return NextResponse.json(
      { error: "No valid cart items." },
      { status: 400 },
    );
  }

  const productIds = [...new Set(normalizedCart.map((item) => item.productId))];
  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
      isPublished: true,
    },
  });

  if (!products.length) {
    return NextResponse.json(
      { error: "No valid products found for checkout." },
      { status: 400 },
    );
  }

  const productById = new Map(products.map((product) => [product.id, product]));

  const lineItems = [];
  const compactCart: Array<{ id: string; q: number }> = [];

  for (const cartItem of normalizedCart) {
    const product = productById.get(cartItem.productId);
    if (!product) {
      return NextResponse.json(
        { error: `Invalid product in cart: ${cartItem.productId}` },
        { status: 400 },
      );
    }

    if (cartItem.quantity > product.stock) {
      return NextResponse.json(
        { error: `Not enough stock for ${product.title}` },
        { status: 400 },
      );
    }

    const unitAmount = Math.round(Number(product.price) * 100);
    if (!Number.isFinite(unitAmount) || unitAmount <= 0) {
      return NextResponse.json(
        { error: `Invalid price for ${product.title}` },
        { status: 400 },
      );
    }

    compactCart.push({ id: product.id, q: cartItem.quantity });
    lineItems.push({
      quantity: cartItem.quantity,
      price_data: {
        currency: product.currency.toLowerCase(),
        unit_amount: unitAmount,
        product_data: {
          name: product.title,
          description: product.description.slice(0, 200),
        },
      },
    });
  }

  const cartMetadata = JSON.stringify(compactCart);
  if (cartMetadata.length > 500) {
    return NextResponse.json(
      { error: "Cart is too large for metadata. Reduce number of items." },
      { status: 400 },
    );
  }

  try {
    const allowedCountries = getAllowedShippingCountries();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: body.customerEmail,
      line_items: lineItems,
      success_url: `${APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/checkout/cancel`,
      shipping_address_collection: {
        allowed_countries: allowedCountries,
      },
      metadata: {
        cart: cartMetadata,
      },
    });

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to create checkout session.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

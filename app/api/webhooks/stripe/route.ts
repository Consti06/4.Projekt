import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

type CompactCartItem = {
  id: string;
  q: number;
};

function createOrderNumber(): string {
  const now = new Date();
  const datePart = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}`;
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ORD-${datePart}-${randomPart}`;
}

function parseCart(raw: string | undefined): CompactCartItem[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as CompactCartItem[];
    return parsed.filter(
      (item) =>
        typeof item?.id === "string" &&
        typeof item?.q === "number" &&
        item.q > 0,
    );
  } catch {
    return [];
  }
}

async function handleCheckoutCompleted(event: {
  id: string;
  data: { object: { [key: string]: unknown } };
}) {
  const session = event.data.object as {
    id: string;
    amount_total?: number | null;
    currency?: string | null;
    customer_email?: string | null;
    customer_details?: {
      email?: string | null;
    } | null;
    metadata?: Record<string, string>;
    payment_status?: string;
    shipping_cost?: { amount_total?: number | null } | null;
    shipping_details?: {
      name?: string | null;
      phone?: string | null;
      address?: {
        line1?: string | null;
        line2?: string | null;
        city?: string | null;
        state?: string | null;
        postal_code?: string | null;
        country?: string | null;
      } | null;
    } | null;
  };

  const existingPayment = await prisma.payment.findUnique({
    where: { providerPaymentId: session.id },
  });
  if (existingPayment) {
    return;
  }

  const cart = parseCart(session.metadata?.cart);
  if (!cart.length) {
    throw new Error("Missing or invalid cart metadata.");
  }

  const productIds = [...new Set(cart.map((item) => item.id))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
  });

  if (products.length !== productIds.length) {
    throw new Error("One or more products no longer exist.");
  }

  const productById = new Map(products.map((product) => [product.id, product]));

  let subtotal = 0;
  const preparedItems = cart.map((item) => {
    const product = productById.get(item.id);
    if (!product) {
      throw new Error(`Missing product ${item.id}.`);
    }
    if (product.stock < item.q) {
      throw new Error(`Insufficient stock for ${product.title}.`);
    }
    const unitPrice = Number(product.price);
    const lineTotal = unitPrice * item.q;
    subtotal += lineTotal;
    return {
      product,
      quantity: item.q,
      unitPrice,
      lineTotal,
    };
  });

  const shippingAmountCents = session.shipping_cost?.amount_total ?? 0;
  const shippingAmount = shippingAmountCents / 100;
  const totalAmount = (session.amount_total ?? 0) / 100;
  const finalTotal = totalAmount > 0 ? totalAmount : subtotal + shippingAmount;

  const customerEmail = session.customer_email || session.customer_details?.email;
  if (!customerEmail) {
    throw new Error("customer_email is missing from completed session.");
  }

  await prisma.$transaction(async (tx) => {
    for (const item of preparedItems) {
      const updated = await tx.product.updateMany({
        where: {
          id: item.product.id,
          stock: { gte: item.quantity },
        },
        data: {
          stock: { decrement: item.quantity },
        },
      });

      if (updated.count !== 1) {
        throw new Error(`Stock update failed for ${item.product.title}.`);
      }
    }

    const order = await tx.order.create({
      data: {
        orderNumber: createOrderNumber(),
        customerEmail,
        status: "PAID",
        paymentStatus: "PAID",
        subtotalAmount: subtotal,
        shippingAmount,
        totalAmount: finalTotal,
        currency: (session.currency || "usd").toUpperCase(),
        items: {
          create: preparedItems.map((item) => ({
            productId: item.product.id,
            title: item.product.title,
            slug: item.product.slug,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
          })),
        },
      },
    });

    const shipping = session.shipping_details;
    if (shipping?.address?.line1) {
      await tx.address.create({
        data: {
          orderId: order.id,
          fullName: shipping.name || "Unknown",
          line1: shipping.address.line1,
          line2: shipping.address.line2 || null,
          city: shipping.address.city || "Unknown",
          state: shipping.address.state || "Unknown",
          postalCode: shipping.address.postal_code || "Unknown",
          countryCode: shipping.address.country || "US",
          phone: shipping.phone || null,
        },
      });
    }

    await tx.payment.create({
      data: {
        orderId: order.id,
        provider: "stripe",
        providerPaymentId: session.id,
        status: session.payment_status === "paid" ? "PAID" : "PENDING",
        amount: finalTotal,
        currency: (session.currency || "usd").toUpperCase(),
        paidAt: session.payment_status === "paid" ? new Date() : null,
      },
    });
  });
}

export async function POST(request: NextRequest) {
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeWebhookSecret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET is not configured." },
      { status: 500 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header." },
      { status: 400 },
    );
  }

  const body = await request.text();

  let event: { type: string; id: string; data: { object: { [key: string]: unknown } } };
  try {
    event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret) as {
      type: string;
      id: string;
      data: { object: { [key: string]: unknown } };
    };
  } catch (error) {
    return NextResponse.json(
      {
        error: "Invalid webhook signature.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    );
  }

  try {
    if (event.type === "checkout.session.completed") {
      await handleCheckoutCompleted(event);
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: "Webhook handling failed.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}

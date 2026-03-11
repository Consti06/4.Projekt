"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type ProductCard = {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  stock: number;
  heroImage: string | null;
  heroImageAlt: string;
};

type CartMap = Record<string, number>;

const CART_STORAGE_KEY = "art_store_cart_v1";

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function StorefrontClient({ products }: { products: ProductCard[] }) {
  const [cart, setCart] = useState<CartMap>({});
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as CartMap;
      setCart(parsed);
    } catch {
      localStorage.removeItem(CART_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  const cartLines = useMemo(() => {
    return products
      .map((product) => ({
        product,
        quantity: cart[product.id] || 0,
      }))
      .filter((line) => line.quantity > 0);
  }, [cart, products]);

  const cartTotal = useMemo(
    () =>
      cartLines.reduce(
        (sum, line) => sum + line.quantity * Number(line.product.price),
        0,
      ),
    [cartLines],
  );

  function addToCart(product: ProductCard) {
    setError(null);
    setCart((prev) => {
      const current = prev[product.id] || 0;
      if (current >= product.stock) {
        return prev;
      }
      return { ...prev, [product.id]: current + 1 };
    });
  }

  function decreaseFromCart(productId: string) {
    setError(null);
    setCart((prev) => {
      const current = prev[productId] || 0;
      if (current <= 1) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }
      return { ...prev, [productId]: current - 1 };
    });
  }

  async function checkout() {
    if (!cartLines.length) {
      return;
    }

    setError(null);
    setIsCheckingOut(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartItems: cartLines.map((line) => ({
            productId: line.product.id,
            quantity: line.quantity,
          })),
        }),
      });

      const data = (await response.json()) as {
        checkoutUrl?: string;
        error?: string;
        details?: string;
      };

      if (!response.ok || !data.checkoutUrl) {
        throw new Error(data.error || data.details || "Checkout failed.");
      }

      window.location.href = data.checkoutUrl;
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Checkout failed.",
      );
      setIsCheckingOut(false);
    }
  }

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-stone-900">
          Available Paintings
        </h2>
        <p className="text-sm text-stone-700">{products.length} listed</p>
      </div>

      {products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-400/60 bg-white/60 p-8 text-center text-stone-700">
          No artworks are published yet. Add products in the admin flow.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="grid gap-6 sm:grid-cols-2">
            {products.map((product) => (
              <article
                key={product.id}
                className="overflow-hidden rounded-2xl border border-black/10 bg-white/85 shadow-sm transition-transform duration-300 hover:-translate-y-1"
              >
                <div className="relative aspect-[4/3] bg-stone-200">
                  {product.heroImage ? (
                    <Image
                      src={product.heroImage}
                      alt={product.heroImageAlt}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-stone-600">
                      No image
                    </div>
                  )}
                </div>

                <div className="space-y-3 p-4">
                  <h3 className="text-lg font-semibold text-stone-900">
                    {product.title}
                  </h3>
                  <p className="line-clamp-2 text-sm text-stone-700">
                    {product.description}
                  </p>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-lg font-semibold text-stone-900">
                      {formatCurrency(product.price, product.currency || "USD")}
                    </span>
                    <span className="rounded-full bg-stone-900 px-3 py-1 text-xs text-stone-50">
                      {product.stock > 0 ? `${product.stock} left` : "Sold"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => addToCart(product)}
                    disabled={product.stock < 1}
                    className="w-full rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-stone-100 transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-300"
                  >
                    {product.stock < 1 ? "Sold out" : "Add to cart"}
                  </button>
                </div>
              </article>
            ))}
          </div>

          <aside className="h-fit rounded-2xl border border-black/10 bg-white/85 p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-stone-900">Your cart</h3>

            {cartLines.length === 0 ? (
              <p className="mt-3 text-sm text-stone-700">Cart is empty.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {cartLines.map((line) => (
                  <div
                    key={line.product.id}
                    className="rounded-xl border border-stone-200 p-3"
                  >
                    <p className="text-sm font-medium text-stone-900">
                      {line.product.title}
                    </p>
                    <p className="mt-1 text-sm text-stone-700">
                      {formatCurrency(line.product.price, line.product.currency)} x{" "}
                      {line.quantity}
                    </p>
                    <button
                      type="button"
                      onClick={() => decreaseFromCart(line.product.id)}
                      className="mt-2 text-xs text-stone-700 underline"
                    >
                      Remove one
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex items-center justify-between border-t border-stone-200 pt-4">
              <p className="text-sm text-stone-700">Subtotal</p>
              <p className="text-base font-semibold text-stone-900">
                {formatCurrency(cartTotal, "USD")}
              </p>
            </div>

            {error ? (
              <p className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <button
              type="button"
              onClick={checkout}
              disabled={!cartLines.length || isCheckingOut}
              className="mt-4 w-full rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-stone-100 transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-300"
            >
              {isCheckingOut ? "Redirecting..." : "Checkout securely"}
            </button>
          </aside>
        </div>
      )}
    </section>
  );
}

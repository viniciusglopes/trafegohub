import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { requireAuth } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";

const PLAN_PRICES: Record<string, { priceId: string; name: string }> = {
  starter: {
    priceId: process.env.STRIPE_PRICE_STARTER || "",
    name: "Starter",
  },
  pro: {
    priceId: process.env.STRIPE_PRICE_PRO || "",
    name: "Pro",
  },
  agency: {
    priceId: process.env.STRIPE_PRICE_AGENCY || "",
    name: "Agency",
  },
};

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();
    const stripe = getStripe();

    const { plan } = await request.json();
    const planConfig = PLAN_PRICES[plan];

    if (!planConfig || !planConfig.priceId) {
      return NextResponse.json(
        { error: "Plano invalido" },
        { status: 400 }
      );
    }

    const userId = (session!.user as Record<string, string>).id;
    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json(
        { error: "Usuario nao encontrado" },
        { status: 404 }
      );
    }

    let customerId = user.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user._id.toString() },
      });
      customerId = customer.id;
      await User.findByIdAndUpdate(userId, { stripeCustomerId: customerId });
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: planConfig.priceId, quantity: 1 }],
      success_url: `${process.env.NEXTAUTH_URL}/dashboard?checkout=success`,
      cancel_url: `${process.env.NEXTAUTH_URL}/dashboard/plans?checkout=canceled`,
      metadata: {
        userId: user._id.toString(),
        plan,
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json(
      { error: "Erro ao criar sessao de pagamento" },
      { status: 500 }
    );
  }
}

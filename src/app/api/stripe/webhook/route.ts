import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Invoice from "@/models/Invoice";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  await connectDB();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const plan = session.metadata?.plan;

      if (userId && plan) {
        await User.findByIdAndUpdate(userId, {
          plan,
          status: "active",
          stripeSubscriptionId: session.subscription as string,
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        });
      }
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;

      const user = await User.findOne({ stripeCustomerId: customerId });

      if (user) {
        await Invoice.create({
          user: user._id,
          stripeInvoiceId: invoice.id,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          status: "paid",
          paidAt: new Date(),
          planAtTime: user.plan,
        });

        await User.findByIdAndUpdate(user._id, {
          status: "active",
          currentPeriodEnd: invoice.lines.data[0]?.period?.end
            ? new Date(invoice.lines.data[0].period.end * 1000)
            : undefined,
        });
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;

      const user = await User.findOne({ stripeCustomerId: customerId });

      if (user) {
        await User.findByIdAndUpdate(user._id, { status: "past_due" });

        await Invoice.create({
          user: user._id,
          stripeInvoiceId: invoice.id,
          amount: invoice.amount_due,
          currency: invoice.currency,
          status: "failed",
          planAtTime: user.plan,
        });
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      await User.findOneAndUpdate(
        { stripeCustomerId: customerId },
        {
          plan: "free",
          status: "canceled",
          stripeSubscriptionId: undefined,
          currentPeriodEnd: undefined,
        }
      );
      break;
    }
  }

  return NextResponse.json({ received: true });
}

import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { requireAdmin } from "@/lib/auth";

const PLAN_PRICES: Record<string, number> = {
  free: 0,
  starter: 49,
  pro: 99,
  agency: 249,
};

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    await connectDB();

    const [
      totalUsers,
      activeUsers,
      trialUsers,
      paidUsers,
      canceledUsers,
      planDistribution,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: "active" }),
      User.countDocuments({ status: "trial" }),
      User.countDocuments({
        status: "active",
        plan: { $ne: "free" },
      }),
      User.countDocuments({ status: "canceled" }),
      User.aggregate([
        {
          $group: {
            _id: "$plan",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const planDist: Record<string, number> = {};
    let mrr = 0;

    for (const item of planDistribution) {
      planDist[item._id] = item.count;
    }

    const activePaidUsers = await User.find({
      status: "active",
      plan: { $ne: "free" },
    })
      .select("plan")
      .lean();

    for (const user of activePaidUsers) {
      mrr += PLAN_PRICES[user.plan] || 0;
    }

    return NextResponse.json({
      totalUsers,
      activeUsers,
      trialUsers,
      paidUsers,
      canceledUsers,
      mrr,
      planDistribution: planDist,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

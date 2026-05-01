import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Team from "@/models/Team";
import User from "@/models/User";
import { requireAuth } from "@/lib/auth";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();

    const userId = (session!.user as any).id;

    // Check if user owns a team
    let team = await Team.findOne({ owner: userId })
      .populate("owner", "name email image")
      .populate("members.user", "name email image")
      .lean();

    // If not owner, check if user is a member of a team
    if (!team) {
      team = await Team.findOne({ "members.user": userId })
        .populate("owner", "name email image")
        .populate("members.user", "name email image")
        .lean();
    }

    if (!team) {
      return NextResponse.json({ team: null });
    }

    return NextResponse.json({ team });
  } catch (err) {
    console.error("Get team error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();

    const userId = (session!.user as any).id;
    const userPlan = (session!.user as any).plan;

    // Only agency plan users can create teams
    if (userPlan !== "agency") {
      return NextResponse.json(
        { error: "Recurso disponivel apenas no plano Agency" },
        { status: 403 }
      );
    }

    // Check if user already owns a team
    const existingTeam = await Team.findOne({ owner: userId });
    if (existingTeam) {
      return NextResponse.json(
        { error: "Voce ja possui uma equipe" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Nome da equipe e obrigatorio" },
        { status: 400 }
      );
    }

    const team = await Team.create({
      owner: userId,
      name: name.trim(),
      members: [],
      invites: [],
    });

    // Populate for response
    const populated = await Team.findById(team._id)
      .populate("owner", "name email image")
      .lean();

    return NextResponse.json({ team: populated }, { status: 201 });
  } catch (err) {
    console.error("Create team error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

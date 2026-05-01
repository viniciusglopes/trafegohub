import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import connectDB from "@/lib/mongodb";
import Team from "@/models/Team";
import { requireAuth } from "@/lib/auth";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();

    const userId = (session!.user as any).id;
    const body = await request.json();
    const { email, role } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email e obrigatorio" },
        { status: 400 }
      );
    }

    if (!role || !["admin", "editor", "viewer"].includes(role)) {
      return NextResponse.json(
        { error: "Role invalida. Use: admin, editor ou viewer" },
        { status: 400 }
      );
    }

    // Find the team where user is owner or admin
    const team = await Team.findOne({
      $or: [
        { owner: userId },
        { members: { $elemMatch: { user: userId, role: "admin" } } },
      ],
    });

    if (!team) {
      return NextResponse.json(
        { error: "Voce nao tem permissao para convidar membros" },
        { status: 403 }
      );
    }

    // Check if email already has a pending invite
    const existingInvite = team.invites.find(
      (inv) => inv.email.toLowerCase() === email.toLowerCase()
    );
    if (existingInvite) {
      return NextResponse.json(
        { error: "Ja existe um convite pendente para este email" },
        { status: 400 }
      );
    }

    // Check if email is already a member
    const memberIds = team.members.map((m) => m.user.toString());
    // We need to check by email, so query User model
    const { default: User } = await import("@/models/User");
    const existingUser = await User.findOne({
      email: email.toLowerCase(),
    }).lean();

    if (existingUser && memberIds.includes((existingUser as any)._id.toString())) {
      return NextResponse.json(
        { error: "Este usuario ja e membro da equipe" },
        { status: 400 }
      );
    }

    // Check if email is the owner
    if (
      existingUser &&
      (existingUser as any)._id.toString() === team.owner.toString()
    ) {
      return NextResponse.json(
        { error: "Este usuario ja e o dono da equipe" },
        { status: 400 }
      );
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    team.invites.push({
      email: email.toLowerCase(),
      role: role as "admin" | "editor" | "viewer",
      token,
      expiresAt,
      createdAt: new Date(),
    });

    await team.save();

    return NextResponse.json({
      invite: {
        email: email.toLowerCase(),
        role,
        token,
        expiresAt,
      },
    });
  } catch (err) {
    console.error("Invite member error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

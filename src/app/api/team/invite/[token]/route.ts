import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Team from "@/models/Team";
import { requireAuth } from "@/lib/auth";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    await connectDB();

    const { token } = await params;

    const team = await Team.findOne({ "invites.token": token })
      .populate("owner", "name email")
      .lean();

    if (!team) {
      return NextResponse.json(
        { error: "Convite nao encontrado" },
        { status: 404 }
      );
    }

    const invite = (team as any).invites.find(
      (inv: any) => inv.token === token
    );

    if (!invite) {
      return NextResponse.json(
        { error: "Convite nao encontrado" },
        { status: 404 }
      );
    }

    if (new Date(invite.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: "Convite expirado" },
        { status: 410 }
      );
    }

    return NextResponse.json({
      invite: {
        teamName: team.name,
        role: invite.role,
        email: invite.email,
        expiresAt: invite.expiresAt,
      },
    });
  } catch (err) {
    console.error("Validate invite error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();

    const { token } = await params;
    const userId = (session!.user as any).id;

    const team = await Team.findOne({ "invites.token": token });

    if (!team) {
      return NextResponse.json(
        { error: "Convite nao encontrado" },
        { status: 404 }
      );
    }

    const inviteIndex = team.invites.findIndex(
      (inv) => inv.token === token
    );

    if (inviteIndex === -1) {
      return NextResponse.json(
        { error: "Convite nao encontrado" },
        { status: 404 }
      );
    }

    const invite = team.invites[inviteIndex];

    if (new Date(invite.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: "Convite expirado" },
        { status: 410 }
      );
    }

    // Check if user is already a member
    const isAlreadyMember = team.members.some(
      (m) => m.user.toString() === userId
    );
    if (isAlreadyMember) {
      return NextResponse.json(
        { error: "Voce ja e membro desta equipe" },
        { status: 400 }
      );
    }

    // Check if user is the owner
    if (team.owner.toString() === userId) {
      return NextResponse.json(
        { error: "Voce ja e o dono desta equipe" },
        { status: 400 }
      );
    }

    // Add user to members and remove invite
    team.members.push({
      user: userId as any,
      role: invite.role,
      invitedAt: invite.createdAt,
      joinedAt: new Date(),
    });

    team.invites.splice(inviteIndex, 1);
    await team.save();

    const populated = await Team.findById(team._id)
      .populate("owner", "name email image")
      .populate("members.user", "name email image")
      .lean();

    return NextResponse.json({ team: populated });
  } catch (err) {
    console.error("Accept invite error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Team from "@/models/Team";
import { requireAuth } from "@/lib/auth";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();

    const { id: memberId } = await params;
    const userId = (session!.user as any).id;
    const body = await request.json();
    const { role } = body;

    if (!role || !["admin", "editor", "viewer"].includes(role)) {
      return NextResponse.json(
        { error: "Role invalida. Use: admin, editor ou viewer" },
        { status: 400 }
      );
    }

    // Find team where user is owner or admin
    const team = await Team.findOne({
      $or: [
        { owner: userId },
        { members: { $elemMatch: { user: userId, role: "admin" } } },
      ],
    });

    if (!team) {
      return NextResponse.json(
        { error: "Voce nao tem permissao para alterar membros" },
        { status: 403 }
      );
    }

    const member = team.members.find(
      (m) => m.user.toString() === memberId
    );

    if (!member) {
      return NextResponse.json(
        { error: "Membro nao encontrado" },
        { status: 404 }
      );
    }

    // Non-owner admins cannot change other admins
    if (
      team.owner.toString() !== userId &&
      member.role === "admin"
    ) {
      return NextResponse.json(
        { error: "Apenas o dono pode alterar administradores" },
        { status: 403 }
      );
    }

    member.role = role;
    await team.save();

    const populated = await Team.findById(team._id)
      .populate("owner", "name email image")
      .populate("members.user", "name email image")
      .lean();

    return NextResponse.json({ team: populated });
  } catch (err) {
    console.error("Update member error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();

    const { id: memberId } = await params;
    const userId = (session!.user as any).id;

    // Find the team
    const team = await Team.findOne({
      $or: [
        { owner: userId },
        { members: { $elemMatch: { user: userId, role: "admin" } } },
        { members: { $elemMatch: { user: userId } } }, // Members can remove themselves
      ],
    });

    if (!team) {
      return NextResponse.json(
        { error: "Equipe nao encontrada" },
        { status: 404 }
      );
    }

    const memberIndex = team.members.findIndex(
      (m) => m.user.toString() === memberId
    );

    if (memberIndex === -1) {
      return NextResponse.json(
        { error: "Membro nao encontrado" },
        { status: 404 }
      );
    }

    const isOwner = team.owner.toString() === userId;
    const isAdmin = team.members.some(
      (m) => m.user.toString() === userId && m.role === "admin"
    );
    const isSelf = memberId === userId;

    // Only owner, admin, or self can remove
    if (!isOwner && !isAdmin && !isSelf) {
      return NextResponse.json(
        { error: "Voce nao tem permissao para remover este membro" },
        { status: 403 }
      );
    }

    // Non-owner admins cannot remove other admins
    if (
      !isOwner &&
      isAdmin &&
      !isSelf &&
      team.members[memberIndex].role === "admin"
    ) {
      return NextResponse.json(
        { error: "Apenas o dono pode remover administradores" },
        { status: 403 }
      );
    }

    team.members.splice(memberIndex, 1);
    await team.save();

    const populated = await Team.findById(team._id)
      .populate("owner", "name email image")
      .populate("members.user", "name email image")
      .lean();

    return NextResponse.json({ team: populated });
  } catch (err) {
    console.error("Remove member error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

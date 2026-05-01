import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import Team from "@/models/Team";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function getSession() {
  return await getServerSession(authOptions);
}

export async function requireAuth() {
  const session = await getSession();

  if (!session?.user) {
    return {
      session: null,
      error: NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      ),
    };
  }

  return { session, error: null };
}

export async function requireAdmin() {
  const { session, error } = await requireAuth();

  if (error) {
    return { session: null, error };
  }

  if ((session!.user as any).role !== "admin") {
    return {
      session: null,
      error: NextResponse.json(
        { error: "Forbidden: admin access required" },
        { status: 403 }
      ),
    };
  }

  return { session, error: null };
}

export async function getTeamContext(userId: string): Promise<{
  teamId: string;
  role: "owner" | "admin" | "editor" | "viewer";
  ownerId: string;
} | null> {
  await connectDB();

  // Check if user is the owner of a team
  const ownedTeam = await Team.findOne({ owner: userId }).lean();
  if (ownedTeam) {
    return {
      teamId: (ownedTeam as any)._id.toString(),
      role: "owner",
      ownerId: userId,
    };
  }

  // Check if user is a member of a team
  const memberTeam = await Team.findOne({ "members.user": userId }).lean();
  if (memberTeam) {
    const member = (memberTeam as any).members.find(
      (m: any) => m.user.toString() === userId
    );
    return {
      teamId: (memberTeam as any)._id.toString(),
      role: member?.role || "viewer",
      ownerId: (memberTeam as any).owner.toString(),
    };
  }

  return null;
}

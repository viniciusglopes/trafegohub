import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface ITeamMember {
  user: Types.ObjectId;
  role: "admin" | "editor" | "viewer";
  invitedAt: Date;
  joinedAt: Date;
}

export interface ITeamInvite {
  email: string;
  role: "admin" | "editor" | "viewer";
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface ITeam extends Document {
  owner: Types.ObjectId;
  name: string;
  members: ITeamMember[];
  invites: ITeamInvite[];
  createdAt: Date;
  updatedAt: Date;
}

const TeamMemberSchema = new Schema<ITeamMember>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "editor", "viewer"],
      required: true,
    },
    invitedAt: {
      type: Date,
      required: true,
    },
    joinedAt: {
      type: Date,
      required: true,
    },
  },
  { _id: true }
);

const TeamInviteSchema = new Schema<ITeamInvite>(
  {
    email: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "editor", "viewer"],
      required: true,
    },
    token: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const TeamSchema = new Schema<ITeam>(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    members: [TeamMemberSchema],
    invites: [TeamInviteSchema],
  },
  {
    timestamps: true,
  }
);

const Team: Model<ITeam> =
  mongoose.models.Team || mongoose.model<ITeam>("Team", TeamSchema);

export default Team;

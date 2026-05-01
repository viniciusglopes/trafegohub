import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        await connectDB();

        const user = await User.findOne({ email: credentials.email }).select(
          "+password"
        );

        if (!user) {
          throw new Error("Invalid email or password");
        }

        if (!user.password) {
          throw new Error(
            "This account uses social login. Please sign in with Google."
          );
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error("Invalid email or password");
        }

        await User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() });

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          plan: user.plan,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        await connectDB();

        const email = user.email as string;
        const existingUser = await User.findOne({ email });

        if (!existingUser) {
          const newUser = await User.create({
            email,
            name: user.name || email,
            image: user.image || undefined,
            plan: "free",
            status: "trial",
            role: "user",
            trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            lastLoginAt: new Date(),
          });
          (user as any).id = newUser._id.toString();
          (user as any).role = newUser.role;
          (user as any).plan = newUser.plan;
        } else {
          await User.findByIdAndUpdate(existingUser._id, {
            lastLoginAt: new Date(),
            image: user.image || undefined,
          });
          (user as any).id = existingUser._id.toString();
          (user as any).role = existingUser.role;
          (user as any).plan = existingUser.plan;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id ?? user.id;
        token.role = (user as any).role ?? "user";
        token.plan = (user as any).plan ?? "free";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).plan = token.plan;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

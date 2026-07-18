import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Discord from "next-auth/providers/discord";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/admin-access";
import { loginSchema } from "@/lib/validation";

async function syncTokenWithDatabase(token: {
  sub?: string;
  name?: string | null;
  email?: string | null;
  roles?: unknown;
}) {
  const userId = token.sub?.trim();
  const email = token.email?.toLowerCase().trim();

  const dbUser = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        include: { roles: true },
      })
    : email
      ? await prisma.user.findUnique({
          where: { email },
          include: { roles: true },
        })
      : null;

  if (!dbUser) {
    token.roles = [];
    return token;
  }

  token.sub = dbUser.id;
  token.name = dbUser.name;
  token.email = dbUser.email;
  token.roles = dbUser.roles.map((role: { role: string }) => role.role);

  return token;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    ...(process.env.AUTH_DISCORD_ID && process.env.AUTH_DISCORD_SECRET
      ? [
          Discord({
            clientId: process.env.AUTH_DISCORD_ID,
            clientSecret: process.env.AUTH_DISCORD_SECRET,
          }),
        ]
      : []),
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
          }),
        ]
      : []),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
          include: { roles: true },
        });

        if (!user) {
          return null;
        }

        if (!user.passwordHash) {
          return null;
        }

        const passwordMatches = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash
        );

        if (!passwordMatches) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          roles: user.roles.map((role: { role: string }) => role.role),
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (
        account?.provider &&
        account.provider !== "credentials" &&
        user.email
      ) {
        await prisma.user.upsert({
          where: { email: user.email.toLowerCase() },
          update: {
            name: user.name ?? user.email,
          },
          create: {
            email: user.email.toLowerCase(),
            name: user.name ?? user.email,
            passwordHash: null,
          },
        });
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        token.email = user.email.toLowerCase();
      }

      if (!user?.email && user) {
        token.roles = (user as { roles?: string[] }).roles ?? [];
      }

      if (typeof user?.id === "string" && user.id) {
        token.sub = user.id;
      }

      return syncTokenWithDatabase(token);
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.name = typeof token.name === "string" ? token.name : null;
        session.user.email =
          typeof token.email === "string" ? token.email : (session.user.email ?? "");
        session.user.roles = Array.isArray(token.roles)
          ? (token.roles as string[])
          : [];
      }

      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      if (url.startsWith(baseUrl)) {
        return url;
      }

      return baseUrl;
    },
    async authorized({ auth: session, request }) {
      const pathname = request.nextUrl.pathname;
      const roles = session?.user?.roles ?? [];

      if (pathname.startsWith("/admin/grimoire-gathering")) {
        return isAdminEmail(session?.user?.email) || roles.includes("EVENT_ADMIN");
      }

      if (pathname.startsWith("/admin")) {
        return isAdminEmail(session?.user?.email);
      }

      if (pathname.startsWith("/player")) {
        return roles.includes("PLAYER");
      }

      if (pathname.startsWith("/dm")) {
        return roles.includes("DM");
      }

      return true;
    },
  },
});

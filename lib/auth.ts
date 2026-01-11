import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { sql } from "@/db";

type ParentRow = {
  id: string;
  email: string | null;
  phone: string | null;
  password_hash: string;
};

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "parent-credentials",
      name: "Parent Credentials",
      credentials: {
        identifier: { label: "Email or phone", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const identifier = String(credentials?.identifier ?? "").trim();
        const password = String(credentials?.password ?? "");

        if (!identifier || !password) return null;

        const isEmail = identifier.includes("@");

        const rows = (isEmail
          ? await sql`SELECT id, email, phone, password_hash FROM parents WHERE lower(email) = lower(${identifier}) LIMIT 1`
          : await sql`SELECT id, email, phone, password_hash FROM parents WHERE phone = ${identifier} LIMIT 1`) as unknown as ParentRow[];

        const parent = rows[0];
        if (!parent) return null;

        const ok = await bcrypt.compare(password, parent.password_hash);
        if (!ok) return null;

        return {
          id: parent.id,
          email: parent.email ?? undefined,
          name: parent.email ?? parent.phone ?? "Parent",
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/",
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
};

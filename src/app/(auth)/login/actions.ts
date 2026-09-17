"use server";

import { redirect } from "next/navigation";

import { createSession } from "@/server/auth/auth";
import { authenticateUser } from "@/server/services/auth.service";
import { loginSchema } from "@/lib/validations/auth";

export type LoginState = { error?: string };

export async function loginAction(_previousState: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: "Enter a valid email and password." };

  try {
    const user = await authenticateUser(parsed.data.email, parsed.data.password);
    if (!user) {
      return { error: "Unable to sign in with those details." };
    }

    await createSession(user.id);
    redirect("/dashboard");
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) throw error;
    console.error("Login failed because the authentication database is unavailable.", error);
    return { error: "Login is temporarily unavailable. Start MongoDB, apply the Prisma schema, and seed the admin account." };
  }
}

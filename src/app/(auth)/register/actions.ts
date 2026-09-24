"use server";

import { redirect } from "next/navigation";
import { ZodError } from "zod";

import { createSession } from "@/server/auth/auth";
import { registerPharmacy } from "@/server/services/registration.service";

export type RegistrationState = { error?: string };

export async function registerAction(_previousState: RegistrationState, formData: FormData): Promise<RegistrationState> {
  try {
    const user = await registerPharmacy({
      pharmacyName: formData.get("pharmacyName"),
      ownerName: formData.get("ownerName"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
      address: formData.get("address"),
      city: formData.get("city"),
      state: formData.get("state"),
      pincode: formData.get("pincode"),
      gstin: formData.get("gstin"),
      drugLicenseNumber: formData.get("drugLicenseNumber"),
    });
    await createSession(user.id);
    redirect("/dashboard");
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) throw error;
    if (error instanceof ZodError) return { error: error.issues[0]?.message ?? "Check the registration fields." };
    if (error instanceof Error && error.message.includes("already exists")) return { error: error.message };
    console.error("Registration failed", error);
    return { error: "Registration is temporarily unavailable. Check the database connection and try again." };
  }
}

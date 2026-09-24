"use client";

import Link from "next/link";
import { useActionState } from "react";
import { 
  Building2, 
  User, 
  Phone, 
  Mail, 
  Lock, 
  MapPin, 
  FileText, 
  ShieldCheck, 
  Loader2, 
  AlertCircle,
  ArrowRight,
  Pill,
  CheckCircle2,
  Sparkles
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { registerAction, type RegistrationState } from "./actions";

const initialState: RegistrationState = {};

export default function RegisterPage() {
  const [state, action, pending] = useActionState(registerAction, initialState);

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-slate-950 p-4 sm:p-6 md:p-10 overflow-hidden">
      
      {/* Dynamic Background Glow Effects */}
      <div className="absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 h-[500px] w-[500px] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />

      {/* Grid Pattern Overlay */}
      <div 
        className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none"
      />

      {/* Main Container Card */}
      <div className="relative z-10 w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-xl grid lg:grid-cols-12">
        
        {/* Left Side: Brand Highlight Banner */}
        <div className="lg:col-span-4 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-inner">
                <Pill className="size-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                  Pharmacy Suite
                </span>
                <h2 className="text-xl font-extrabold tracking-tight text-white">
                  Medica
                </h2>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <h3 className="text-lg font-bold text-white leading-snug">
                Streamline Your Medical Store Operations
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Join hundreds of pharmacy owners managing inventory, GST billing, and supplier ledgers in one workspace.
              </p>
            </div>

            {/* Feature Bullet Points */}
            <ul className="mt-8 space-y-3.5">
              {[
                "GST Ready Sales & Purchase Invoices",
                "Automated Drug Expiry & Low Stock Alerts",
                "Drug License (D.L.) & Batch Tracking",
                "Customer Payment Ledger Management"
              ].map((item, idx) => (
                <li key={idx} className="flex items-center gap-2.5 text-xs text-slate-300">
                  <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-10 pt-6 border-t border-slate-800/80 flex items-center gap-2 text-[11px] text-slate-400">
            <Sparkles className="size-4 text-emerald-400" />
            <span>Encrypted & Compliant Workspace</span>
          </div>
        </div>

        {/* Right Side: Registration Form */}
        <div className="lg:col-span-8 p-6 sm:p-8 md:p-10 bg-slate-900/50">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Register Your Pharmacy
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              Fill in your pharmacy and admin credentials to set up your isolated workspace.
            </p>
          </div>

          <form action={action} className="space-y-6">
            
            {/* Section 1: Basic Info */}
            <div className="space-y-3.5">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Building2 className="size-3.5" /> 1. Store & Admin Identity
              </h2>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <label htmlFor="pharmacyName" className="text-xs font-semibold text-slate-200">
                    Pharmacy Name <span className="text-emerald-400">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 size-4 text-slate-500" />
                    <Input
                      id="pharmacyName"
                      name="pharmacyName"
                      placeholder="e.g. Apollo Pharmacy / City Medicos"
                      className="pl-9 bg-slate-950/80 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-emerald-500"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="ownerName" className="text-xs font-semibold text-slate-200">
                    Owner Name <span className="text-emerald-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 size-4 text-slate-500" />
                    <Input
                      id="ownerName"
                      name="ownerName"
                      placeholder="Full Name"
                      className="pl-9 bg-slate-950/80 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-emerald-500"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="phone" className="text-xs font-semibold text-slate-200">
                    Mobile Number <span className="text-emerald-400">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 size-4 text-slate-500" />
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="10-digit phone number"
                      className="pl-9 bg-slate-950/80 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-emerald-500"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label htmlFor="email" className="text-xs font-semibold text-slate-200">
                    Email Address <span className="text-emerald-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 size-4 text-slate-500" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="admin@yourpharmacy.com"
                      className="pl-9 bg-slate-950/80 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-emerald-500"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Passwords */}
            <div className="space-y-3.5 pt-4 border-t border-slate-800">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="size-3.5" /> 2. Security Passwords
              </h2>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="password" className="text-xs font-semibold text-slate-200">
                    Password <span className="text-emerald-400">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 size-4 text-slate-500" />
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Min. 12 characters"
                      minLength={12}
                      className="pl-9 bg-slate-950/80 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-emerald-500"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="confirmPassword" className="text-xs font-semibold text-slate-200">
                    Confirm Password <span className="text-emerald-400">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 size-4 text-slate-500" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Re-type password"
                      className="pl-9 bg-slate-950/80 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-emerald-500"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Compliance & Address */}
            <div className="space-y-3.5 pt-4 border-t border-slate-800">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <MapPin className="size-3.5" /> 3. Address & Tax Licenses
              </h2>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <label htmlFor="address" className="text-xs font-semibold text-slate-200">
                    Store Address
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 size-4 text-slate-500" />
                    <Input
                      id="address"
                      name="address"
                      placeholder="Shop Number, Street Name, Area"
                      className="pl-9 bg-slate-950/80 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="city" className="text-xs font-semibold text-slate-200">
                    City
                  </label>
                  <Input id="city" name="city" placeholder="e.g. Mumbai" className="bg-slate-950/80 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-emerald-500" />
                </div>

                <div className="space-y-1">
                  <label htmlFor="state" className="text-xs font-semibold text-slate-200">
                    State
                  </label>
                  <Input id="state" name="state" placeholder="e.g. Maharashtra" className="bg-slate-950/80 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-emerald-500" />
                </div>

                <div className="space-y-1">
                  <label htmlFor="pincode" className="text-xs font-semibold text-slate-200">
                    Pincode
                  </label>
                  <Input id="pincode" name="pincode" inputMode="numeric" placeholder="6-digit PIN" className="bg-slate-950/80 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-emerald-500" />
                </div>

                <div className="space-y-1">
                  <label htmlFor="gstin" className="text-xs font-semibold text-slate-200">
                    GSTIN <span className="font-normal text-slate-500">(Optional)</span>
                  </label>
                  <Input
                    id="gstin"
                    name="gstin"
                    placeholder="22AAAAA0000A1Z5"
                    className="bg-slate-950/80 border-slate-800 text-slate-100 font-mono text-xs uppercase placeholder:text-slate-600 focus-visible:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label htmlFor="drugLicenseNumber" className="text-xs font-semibold text-slate-200">
                    Drug License (D.L. No.) <span className="font-normal text-slate-500">(Optional)</span>
                  </label>
                  <Input
                    id="drugLicenseNumber"
                    name="drugLicenseNumber"
                    placeholder="e.g. DL-20B/123456"
                    className="bg-slate-950/80 border-slate-800 text-slate-100 font-mono text-xs placeholder:text-slate-600 focus-visible:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Error Message Alert */}
            {state?.error && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-950/40 p-3 text-xs font-medium text-red-400"
              >
                <AlertCircle className="size-4 shrink-0" />
                <span>{state.error}</span>
              </div>
            )}

            {/* Submit Action Button */}
            <Button
              size="lg"
              className="w-full gap-2 font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
              disabled={pending}
            >
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creating Workspace...
                </>
              ) : (
                <>
                  Create Pharmacy Workspace
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </form>

          {/* Footer Navigation */}
          <p className="mt-6 text-center text-xs text-slate-400">
            Already registered?{" "}
            <Link
              href="/login"
              className="font-semibold text-emerald-400 hover:underline underline-offset-4"
            >
              Sign in to workspace
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
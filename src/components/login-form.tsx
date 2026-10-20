"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth";
import { getFirebaseClient } from "@/lib/firebase-client";
import { normalizeIndianMobile } from "@/lib/phone";

export function LoginForm({ next = "/dashboard" }: { next?: string }) {
  const [phone, setPhone] = useState("");
  const [phoneConsent, setPhoneConsent] = useState(false);
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(0);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const confirmation = useRef<ConfirmationResult | null>(null);
  const verifier = useRef<RecaptchaVerifier | null>(null);
  const router = useRouter();

  useEffect(() => () => { void verifier.current?.clear(); }, []);

  async function send(e: React.FormEvent) {
    e.preventDefault(); setMsg("");
    const e164 = normalizeIndianMobile(phone);
    if (!e164) { setMsg("Enter a valid 10-digit Indian mobile number."); return; }
    if (!phoneConsent) { setMsg("Please agree to phone verification before requesting an OTP."); return; }
    setBusy(true);
    try {
      const { auth } = getFirebaseClient();
      verifier.current?.clear();
      verifier.current = new RecaptchaVerifier(auth, "recaptcha-container", { size: "normal" });
      confirmation.current = await signInWithPhoneNumber(auth, e164, verifier.current);
      setStep(1); setMsg(`Firebase sent a verification code to ${e164}. Check your SMS.`);
    } catch (error) {
      verifier.current?.clear(); verifier.current = null;
      setMsg(error instanceof Error ? error.message : "Firebase could not send the verification code.");
    } finally { setBusy(false); }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg("");
    try {
      if (!confirmation.current) throw new Error("Request a new verification code first.");
      const credential = await confirmation.current.confirm(otp);
      const idToken = await credential.user.getIdToken();
      const response = await fetch("/api/auth/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Sign-in could not be completed.");
      router.push(result.needsProfile ? "/onboarding" : next); router.refresh();
    } catch (error) { setMsg(error instanceof Error ? error.message : "The code is invalid or expired."); }
    finally { setBusy(false); }
  }

  return <main className="page"><div className="panel auth-panel"><div className="eyebrow">Welcome to KHOJO</div><h1>{step ? "Enter your OTP" : "Log in or sign up"}</h1><p className="muted">{step ? `Firebase sent a code to +91 ${phone}.` : "Verify your Indian mobile number securely with Firebase."}</p>{msg && <p className="notice" role="status">{msg}</p>}<form onSubmit={step ? verify : send}>{!step ? <><div className="field"><label htmlFor="phone">Mobile number</label><div style={{ display: "flex", gap: 7 }}><span className="panel" style={{ padding: 12, whiteSpace: "nowrap" }}>🇮🇳 +91</span><input id="phone" inputMode="numeric" autoComplete="tel-national" placeholder="98765 43210" value={phone} onChange={e => setPhone(e.target.value)} required /></div></div><label className="muted" style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 13, lineHeight: 1.5, marginTop: 12 }}><input type="checkbox" checked={phoneConsent} onChange={e => setPhoneConsent(e.target.checked)} style={{ marginTop: 3 }} />I agree to verify this number by SMS. I understand Firebase/Google processes my phone number for authentication and abuse prevention, and my carrier may charge SMS rates.</label></> : <div className="field"><label htmlFor="otp">One-time password</label><input id="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="6 digit code" value={otp} onChange={e => setOtp(e.target.value)} required /></div>}<div id="recaptcha-container" style={{ margin: "12px 0" }} /><button disabled={busy} className="button" style={{ width: "100%", marginTop: 8 }}>{busy ? "Please wait…" : step ? "Verify and continue" : "Send OTP"}</button></form>{step && <button className="button light small" style={{ width: "100%", marginTop: 10 }} onClick={() => { setStep(0); setOtp(""); setMsg(""); confirmation.current = null; }}>Change number</button>}<p className="muted" style={{ fontSize: 12, marginTop: 18 }}>Firebase handles OTP delivery and verification. Never share your OTP with anyone.</p></div></main>;
}

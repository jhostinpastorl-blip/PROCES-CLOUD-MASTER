import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  classifyConfirmationFailure,
  classifyResendFailure,
  isEmailOtpType,
  resolveConfirmationInput,
} from "../src/lib/auth/email-confirmation.ts";

test("callback accepts supported token_hash email types", () => {
  for (const type of ["email", "signup", "invite", "magiclink", "recovery", "email_change"]) {
    assert.equal(isEmailOtpType(type), true);
  }
  assert.equal(isEmailOtpType("admin"), false);
  assert.equal(isEmailOtpType(null), false);
});

test("callback selects code exchange when a PKCE code is present", () => {
  assert.deepEqual(resolveConfirmationInput(new URLSearchParams("code=pkce-code")), {
    method: "code",
    code: "pkce-code",
  });
});

test("callback selects token verification for token_hash links", () => {
  assert.deepEqual(resolveConfirmationInput(new URLSearchParams("token_hash=hash&type=signup")), {
    method: "token_hash",
    tokenHash: "hash",
    type: "signup",
  });
});

test("callback rejects corrupt or incomplete input", () => {
  assert.deepEqual(resolveConfirmationInput(new URLSearchParams("token_hash=hash&type=admin")), {
    method: "invalid",
  });
});

test("callback preserves provider errors for safe classification", () => {
  assert.deepEqual(resolveConfirmationInput(new URLSearchParams("error_code=otp_expired&error_description=expired")), {
    method: "provider_error",
    error: { code: "otp_expired", message: "expired" },
  });
});

test("callback recognizes confirmed identity when PKCE verifier is unavailable", () => {
  assert.equal(classifyConfirmationFailure({ code: "pkce_code_verifier_not_found" }), "confirmed-login");
  assert.equal(classifyConfirmationFailure({ name: "AuthPKCECodeVerifierMissingError" }), "confirmed-login");
});

test("callback distinguishes expired and invalid confirmation failures", () => {
  assert.equal(classifyConfirmationFailure({ code: "otp_expired" }), "expired");
  assert.equal(classifyConfirmationFailure({ code: "flow_state_expired" }), "expired");
  assert.equal(classifyConfirmationFailure({ code: "bad_code_verifier" }), "invalid");
});

test("resend uses provider rate-limit evidence", () => {
  assert.equal(classifyResendFailure({ code: "over_email_send_rate_limit" }), "rate");
  assert.equal(classifyResendFailure({ status: 429 }), "rate");
});

test("resend distinguishes already-confirmed and provider failures", () => {
  assert.equal(classifyResendFailure({ message: "Email already confirmed" }), "confirmed-login");
  assert.equal(classifyResendFailure({ code: "unexpected_failure" }), "provider");
});

test("successful callback resolves first-entry and prevents response caching", async () => {
  const source = await readFile(new URL("../src/app/auth/callback/route.ts", import.meta.url), "utf8");
  assert.match(source, /getFirstEntryDestination\(next \?\? "\/onboarding"\)/);
  assert.match(source, /Cache-Control", "no-store, max-age=0"/);
});

test("logout clears the local session and protected app layout redirects anonymous users", async () => {
  const logout = await readFile(new URL("../src/app/logout/actions.ts", import.meta.url), "utf8");
  const layout = await readFile(new URL("../src/app/app/layout.tsx", import.meta.url), "utf8");
  assert.match(logout, /signOut\(\{scope:"local"\}\)/);
  assert.match(logout, /redirect\("\/login"\)/);
  assert.match(layout, /if\(!user\)redirect\("\/login"\)/);
});

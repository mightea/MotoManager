import {
  startRegistration,
  startAuthentication,
} from "@simplewebauthn/browser";
import { fetchFromBackend } from "./backend";
import { getSessionToken } from "~/services/auth";

/**
 * Register a new passkey
 */
export async function registerPasskey() {
  console.log("[WebAuthn] Starting registration...");
  const token = getSessionToken();
  
  // 1. Get options from server
  const response = await fetchFromBackend<any>("/auth/passkey/register-options", {}, token);
  console.log("[WebAuthn] Options from server:", response);
  
  if (!response || !response.options) {
    throw new Error("Fehlende Registrierungs-Optionen vom Server");
  }

  const { options, challengeId } = response;

  // 2. Start browser ceremony
  console.log("[WebAuthn] Starting browser registration ceremony...");
  const attestationResponse = await startRegistration({ optionsJSON: options });
  console.log("[WebAuthn] Attestation response:", attestationResponse);

  // 3. Send response back to server for verification
  console.log("[WebAuthn] Sending verification to server...");
  const verificationResult = await fetchFromBackend<any>("/auth/passkey/register-verify", {
    method: "POST",
    body: JSON.stringify({
      challengeId,
      response: attestationResponse,
    }),
  }, token);
  console.log("[WebAuthn] Verification result:", verificationResult);

  if (!verificationResult || !verificationResult.verified) {
    throw new Error("Registrierung fehlgeschlagen: Server-Verifizierung negativ");
  }
  
  return verificationResult;
}

/**
 * Authenticate with a passkey
 */
export async function authenticateWithPasskey(username?: string) {
  console.log("[WebAuthn] Starting authentication for:", username || "any user");
  
  // 1. Get options from server
  const path = username ? `/auth/passkey/login-options?username=${encodeURIComponent(username)}` : "/auth/passkey/login-options";
  const response = await fetchFromBackend<any>(path);
  console.log("[WebAuthn] Options from server:", response);

  if (!response || !response.options) {
    throw new Error("Fehlende Login-Optionen vom Server");
  }

  const { options, challengeId } = response;

  // 2. Start browser ceremony
  console.log("[WebAuthn] Starting browser authentication ceremony...");
  const assertionResponse = await startAuthentication({ optionsJSON: options });
  console.log("[WebAuthn] Assertion response:", assertionResponse);

  // 3. Send response back to server for verification
  console.log("[WebAuthn] Sending verification to server...");
  const verificationResult = await fetchFromBackend<any>("/auth/passkey/login-verify", {
    method: "POST",
    body: JSON.stringify({
      challengeId,
      response: assertionResponse,
    }),
  });
  console.log("[WebAuthn] Verification result:", verificationResult);

  if (!verificationResult || !verificationResult.verified) {
    throw new Error("Login fehlgeschlagen: Server-Verifizierung negativ");
  }
  
  return verificationResult;
}

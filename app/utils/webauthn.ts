import {
  startRegistration,
  startAuthentication,
} from "@simplewebauthn/browser";
import { getSessionToken, createSession } from "~/services/auth";

/**
 * Register a new passkey
 */
export async function registerPasskey() {
  console.log("[WebAuthn] Starting registration...");
  const token = getSessionToken();
  
  // 1. Get options from server (via proxy)
  const response = await fetch("/api/auth/passkey/register-options", {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });
  if (!response.ok) throw new Error("Could not get registration options");
  
  const responseData = await response.json();
  console.log("[WebAuthn] Full response data from /api/auth/passkey/register-options:", responseData);
  const { options, challengeId } = responseData;
  
  if (!options) throw new Error("Server response missing 'options'");
  if (!challengeId) throw new Error("Server response missing 'challengeId'");
  
  console.log("[WebAuthn] Options from server:", options);

  // 2. Start browser ceremony
  console.log("[WebAuthn] Starting browser registration ceremony...");
  // The backend wraps the options in a "publicKey" field
  const attestationResponse = await startRegistration({ optionsJSON: options.publicKey || options });
  console.log("[WebAuthn] Attestation response:", attestationResponse);

  // 3. Send response back to server for verification (via proxy)
  console.log("[WebAuthn] Sending verification to server...");
  const verificationResponse = await fetch("/api/auth/passkey/register-verify", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      challengeId,
      response: attestationResponse,
    }),
  });

  const verificationResult = await verificationResponse.json();
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
  
  // 1. Get options from server (via proxy)
  const url = username ? `/api/auth/passkey/login-options?username=${encodeURIComponent(username)}` : "/api/auth/passkey/login-options";
  const response = await fetch(url);
  if (!response.ok) throw new Error("Could not get authentication options");
  
  const responseData = await response.json();
  const { options, challengeId } = responseData;
  
  if (!options) throw new Error("Server response missing 'options'");
  if (!challengeId) throw new Error("Server response missing 'challengeId'");
  
  console.log("[WebAuthn] Options from server:", options);

  // 2. Start browser ceremony
  console.log("[WebAuthn] Starting browser authentication ceremony...");
  // The backend wraps the options in a "publicKey" field
  const assertionResponse = await startAuthentication({ optionsJSON: options.publicKey || options });
  console.log("[WebAuthn] Assertion response:", assertionResponse);

  // 3. Send response back to server for verification (via proxy)
  console.log("[WebAuthn] Sending verification to server...");
  const verificationResponse = await fetch("/api/auth/passkey/login-verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      challengeId,
      response: assertionResponse,
    }),
  });

  if (!verificationResponse.ok) throw new Error("Authentication failed");
  
  const verificationResult = await verificationResponse.json();
  console.log("[WebAuthn] Verification result:", verificationResult);

  if (!verificationResult || !verificationResult.verified) {
    throw new Error("Login fehlgeschlagen: Server-Verifizierung negativ");
  }

  // Handle session creation on client
  if (verificationResult.token) {
    await createSession(verificationResult.token);
  }
  
  return verificationResult;
}

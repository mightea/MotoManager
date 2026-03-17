import {
  startRegistration,
  startAuthentication,
} from "@simplewebauthn/browser";

/**
 * Register a new passkey
 */
export async function registerPasskey() {
  console.log("[WebAuthn] Starting registration...");
  
  // 1. Get options from server (via proxy)
  const response = await fetch("/api/auth/passkey/register-options");
  if (!response.ok) throw new Error("Could not get registration options");
  
  const { options, challengeId } = await response.json();
  console.log("[WebAuthn] Options from server:", options);

  // 2. Start browser ceremony
  console.log("[WebAuthn] Starting browser registration ceremony...");
  const attestationResponse = await startRegistration({ optionsJSON: options });
  console.log("[WebAuthn] Attestation response:", attestationResponse);

  // 3. Send response back to server for verification (via proxy)
  console.log("[WebAuthn] Sending verification to server...");
  const verificationResponse = await fetch("/api/auth/passkey/register-verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
  
  const { options, challengeId } = await response.json();
  console.log("[WebAuthn] Options from server:", options);

  // 2. Start browser ceremony
  console.log("[WebAuthn] Starting browser authentication ceremony...");
  const assertionResponse = await startAuthentication({ optionsJSON: options });
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
  
  return verificationResult;
}

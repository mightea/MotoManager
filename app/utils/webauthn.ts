import {
  startRegistration,
  startAuthentication,
} from "@simplewebauthn/browser";

/**
 * Register a new passkey
 */
export async function registerPasskey() {
  // 1. Get options from server
  const response = await fetch("/api/auth/passkey/register-options");
  if (!response.ok) throw new Error("Could not get registration options");
  
  const { options, challengeId } = await response.json();

  // 2. Start browser ceremony
  const attestationResponse = await startRegistration({ optionsJSON: options });

  // 3. Send response back to server for verification
  const verificationResponse = await fetch("/api/auth/passkey/register-verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      challengeId,
      response: attestationResponse,
    }),
  });

  const verificationResult = await verificationResponse.json();
  if (!verificationResult.verified) throw new Error("Registration failed");
  
  return verificationResult;
}

/**
 * Authenticate with a passkey
 */
export async function authenticateWithPasskey(username?: string) {
  // 1. Get options from server
  const url = username ? `/api/auth/passkey/login-options?username=${encodeURIComponent(username)}` : "/api/auth/passkey/login-options";
  const response = await fetch(url);
  if (!response.ok) throw new Error("Could not get authentication options");
  
  const { options, challengeId } = await response.json();

  // 2. Start browser ceremony
  const assertionResponse = await startAuthentication({ optionsJSON: options });

  // 3. Send response back to server for verification
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
  if (!verificationResult.verified) throw new Error("Authentication failed");
  
  return verificationResult;
}

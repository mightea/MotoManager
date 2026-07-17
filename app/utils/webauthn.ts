import {
  startRegistration,
  startAuthentication,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import { getSessionToken, createSession } from "~/services/auth";
import { fetchFromBackend } from "./backend";

/**
 * Options responses from the passkey endpoints. The backend may wrap the
 * WebAuthn options in a "publicKey" field (see ceremony steps below).
 */
interface PasskeyOptionsResponse<T> {
  options?: T & { publicKey?: T };
  challengeId?: string;
}

/** Verification responses from the passkey endpoints. */
interface PasskeyVerificationResult {
  verified?: boolean;
  token?: string;
}

/**
 * Register a new passkey
 */
export async function registerPasskey() {
  const token = getSessionToken();

  // 1. Get options from server
  const responseData = await fetchFromBackend<
    PasskeyOptionsResponse<PublicKeyCredentialCreationOptionsJSON>
  >("/auth/passkey/register-options", {}, token);
  const { options, challengeId } = responseData;

  if (!options) throw new Error("Server response missing 'options'");
  if (!challengeId) throw new Error("Server response missing 'challengeId'");

  // 2. Start browser ceremony
  // The backend wraps the options in a "publicKey" field
  const attestationResponse = await startRegistration({ optionsJSON: options.publicKey || options });

  // 3. Send response back to server for verification
  const verificationResult = await fetchFromBackend<PasskeyVerificationResult>("/auth/passkey/register-verify", {
    method: "POST",
    body: JSON.stringify({
      challengeId,
      response: attestationResponse,
    }),
  }, token);

  if (!verificationResult || !verificationResult.verified) {
    throw new Error("Registrierung fehlgeschlagen: Server-Verifizierung negativ");
  }
  
  return verificationResult;
}

/**
 * Authenticate with a passkey
 */
export async function authenticateWithPasskey(username?: string) {
  // 1. Get options from server
  const path = username ? `/auth/passkey/login-options?username=${encodeURIComponent(username)}` : "/auth/passkey/login-options";
  const responseData = await fetchFromBackend<
    PasskeyOptionsResponse<PublicKeyCredentialRequestOptionsJSON>
  >(path);
  const { options, challengeId } = responseData;
  
  if (!options) throw new Error("Server response missing 'options'");
  if (!challengeId) throw new Error("Server response missing 'challengeId'");

  // 2. Start browser ceremony
  // The backend wraps the options in a "publicKey" field
  const authOptions = options.publicKey || options;
  
  // If no username was provided, we want discoverable credentials
  if (!username) {
    authOptions.allowCredentials = [];
    authOptions.userVerification = "preferred";
  }

  const assertionResponse = await startAuthentication({ optionsJSON: authOptions });

  // 3. Send response back to server for verification
  const verificationResult = await fetchFromBackend<PasskeyVerificationResult>("/auth/passkey/login-verify", {
    method: "POST",
    body: JSON.stringify({
      challengeId,
      response: assertionResponse,
    }),
  });

  if (!verificationResult || !verificationResult.verified) {
    throw new Error("Login fehlgeschlagen: Server-Verifizierung negativ");
  }

  // Handle session creation on client
  if (verificationResult.token) {
    await createSession(verificationResult.token);
  }
  
  return verificationResult;
}

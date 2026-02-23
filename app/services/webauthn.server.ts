import {
  generateRegistrationOptions as swGenerateRegistrationOptions,
  verifyRegistrationResponse as swVerifyRegistrationResponse,
  generateAuthenticationOptions as swGenerateAuthenticationOptions,
  verifyAuthenticationResponse as swVerifyAuthenticationResponse,
  type VerifiedRegistrationResponse,
  type VerifiedAuthenticationResponse,
} from "@simplewebauthn/server";
import { eq, and, gt } from "drizzle-orm";
import { getDb } from "~/db";
import { authenticators, challenges, users } from "~/db/schema";
import { randomUUID } from "node:crypto";

const RP_ID = process.env.RP_ID ?? "localhost";
const RP_NAME = process.env.RP_NAME ?? "MotoManager";
const ORIGIN = process.env.ORIGIN ?? `http://${RP_ID}:5173`; // Default vite port

/**
 * Generate registration options for a user
 */
export async function generateRegistrationOptions(userId: number) {
  const db = await getDb();
  
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) throw new Error("User not found");

  const userAuthenticators = await db.query.authenticators.findMany({
    where: eq(authenticators.userId, userId),
  });

  const options = await swGenerateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: new TextEncoder().encode(user.id.toString()),
    userName: user.username,
    userDisplayName: user.name,
    attestationType: "none",
    excludeCredentials: userAuthenticators.map((auth) => ({
      id: auth.id,
      type: "public-key",
      transports: auth.transports ? JSON.parse(auth.transports) : undefined,
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
      authenticatorAttachment: "platform",
    },
  });

  // Store challenge
  const challengeId = randomUUID();
  await db.insert(challenges).values({
    id: challengeId,
    userId: user.id,
    challenge: options.challenge,
    expiresAt: new Date(Date.now() + 60000 * 5).toISOString(), // 5 minutes
  });

  return { options, challengeId };
}

/**
 * Verify registration response
 */
export async function verifyRegistrationResponse(
  challengeId: string,
  response: any
) {
  const db = await getDb();
  
  const challengeRecord = await db.query.challenges.findFirst({
    where: and(
      eq(challenges.id, challengeId),
      gt(challenges.expiresAt, new Date().toISOString())
    ),
  });

  if (!challengeRecord || !challengeRecord.userId) {
    throw new Error("Invalid or expired challenge");
  }

  const verification: VerifiedRegistrationResponse = await swVerifyRegistrationResponse({
    response,
    expectedChallenge: challengeRecord.challenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
  });

  const { verified, registrationInfo } = verification;

  if (verified && registrationInfo) {
    const { credential, credentialDeviceType, credentialBackedUp } = registrationInfo;

    // Save the new authenticator
    await db.insert(authenticators).values({
      id: credential.id, // In v13, this is already a Base64URL string
      userId: challengeRecord.userId,
      publicKey: Buffer.from(credential.publicKey),
      counter: credential.counter,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      transports: JSON.stringify(response.response.transports || []),
    });

    // Clean up challenge
    await db.delete(challenges).where(eq(challenges.id, challengeId));
    
    return { verified: true };
  }

  return { verified: false };
}

/**
 * Generate authentication options
 */
export async function generateAuthenticationOptions(username?: string) {
  const db = await getDb();
  
  let userAuthenticators: any[] = [];
  let userId: number | undefined;

  if (username) {
    const user = await db.query.users.findFirst({
      where: eq(users.username, username.trim().toLowerCase()),
    });
    
    if (user) {
      userId = user.id;
      userAuthenticators = await db.query.authenticators.findMany({
        where: eq(authenticators.userId, user.id),
      });
    }
  }

  const options = await swGenerateAuthenticationOptions({
    rpID: RP_ID,
    allowCredentials: userAuthenticators.map((auth) => ({
      id: auth.id,
      type: "public-key",
      transports: auth.transports ? JSON.parse(auth.transports) : undefined,
    })),
    userVerification: "preferred",
  });

  // Store challenge
  const challengeId = randomUUID();
  await db.insert(challenges).values({
    id: challengeId,
    userId, // May be null for "discoverable" credentials
    challenge: options.challenge,
    expiresAt: new Date(Date.now() + 60000 * 5).toISOString(),
  });

  return { options, challengeId };
}

/**
 * Verify authentication response
 */
export async function verifyAuthenticationResponse(
  challengeId: string,
  response: any
) {
  const db = await getDb();
  
  const challengeRecord = await db.query.challenges.findFirst({
    where: and(
      eq(challenges.id, challengeId),
      gt(challenges.expiresAt, new Date().toISOString())
    ),
  });

  if (!challengeRecord) {
    throw new Error("Invalid or expired challenge");
  }

  const credentialId = response.id;
  const authenticator = await db.query.authenticators.findFirst({
    where: eq(authenticators.id, credentialId),
  });

  if (!authenticator) {
    throw new Error("Authenticator not found");
  }

  const verification: VerifiedAuthenticationResponse = await swVerifyAuthenticationResponse({
    response,
    expectedChallenge: challengeRecord.challenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    credential: {
      id: authenticator.id,
      publicKey: new Uint8Array(authenticator.publicKey),
      counter: authenticator.counter,
      transports: authenticator.transports ? JSON.parse(authenticator.transports) : undefined,
    },
  });

  const { verified, authenticationInfo } = verification;

  if (verified && authenticationInfo) {
    // Update counter
    await db.update(authenticators)
      .set({ counter: authenticationInfo.newCounter })
      .where(eq(authenticators.id, credentialId));

    // Clean up challenge
    await db.delete(challenges).where(eq(challenges.id, challengeId));
    
    return { verified: true, userId: authenticator.userId };
  }

  return { verified: false };
}

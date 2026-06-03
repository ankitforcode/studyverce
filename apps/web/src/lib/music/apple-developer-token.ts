import { createSign } from "crypto";

/** Apple MusicKit developer token (JWT, ES256). Valid up to 6 months; we issue ~1h. */
export function createAppleDeveloperToken(): string {
  const teamId = process.env.APPLE_MUSIC_TEAM_ID;
  const keyId = process.env.APPLE_MUSIC_KEY_ID;
  const privateKeyRaw = process.env.APPLE_MUSIC_PRIVATE_KEY;

  if (!teamId || !keyId || !privateKeyRaw) {
    throw new Error("Apple Music API credentials are not configured.");
  }

  const privateKey = privateKeyRaw.replace(/\\n/g, "\n");
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(
    JSON.stringify({ alg: "ES256", kid: keyId })
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({ iss: teamId, iat: now, exp: now + 3600 })
  ).toString("base64url");

  const signingInput = `${header}.${payload}`;
  const sign = createSign("SHA256");
  sign.update(signingInput);
  sign.end();
  const signature = sign.sign(privateKey).toString("base64url");

  return `${signingInput}.${signature}`;
}

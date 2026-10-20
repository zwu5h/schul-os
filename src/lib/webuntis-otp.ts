import { createHmac } from "node:crypto";
import { normalizeMobileSecret, WebUntisApiError } from "./webuntis";

/** RFC 6238 / Untis Mobile: Base32 secret, SHA-1, 30-second step, six digits. */
export function generateWebUntisOtp(secret: string, time = Date.now()): string {
  const normalized = normalizeMobileSecret(secret);
  if (!normalized) throw new WebUntisApiError(400, "Bitte einen gültigen Untis-Mobile-Schlüssel oder den QR-Code aus deinen WebUntis-Freigaben verwenden.");
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bytes: number[] = [];
  let value = 0;
  let bits = 0;
  for (const character of normalized) {
    value = (value << 5) | alphabet.indexOf(character);
    bits += 5;
    if (bits >= 8) { bits -= 8; bytes.push((value >>> bits) & 255); }
  }
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(time / 30_000)));
  const digest = createHmac("sha1", Buffer.from(bytes)).update(counter).digest();
  const offset = digest[digest.length - 1] & 15;
  return String((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}

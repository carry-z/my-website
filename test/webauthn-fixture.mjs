// Synthetic authenticator: test keys only, never imported by application code.
import { createHash, generateKeyPairSync, randomBytes, sign } from "node:crypto";
import { encodeCBOR } from "@levischuck/tiny-cbor";

const digest = value => createHash("sha256").update(value).digest();
const b64 = value => Buffer.from(value).toString("base64url");
export function virtualPasskey() {
  const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const jwk = publicKey.export({ format: "jwk" });
  const id = randomBytes(32);
  const cose = encodeCBOR(new Map([
    [1, 2], [3, -7], [-1, 1],
    [-2, new Uint8Array(Buffer.from(jwk.x, "base64url"))],
    [-3, new Uint8Array(Buffer.from(jwk.y, "base64url"))],
  ]));
  function client(type, challenge, origin) {
    return Buffer.from(JSON.stringify({ type, challenge, origin, crossOrigin: false }));
  }
  return {
    id: b64(id),
    registration(options, rp, flags = 0x45) {
      const length = Buffer.alloc(2); length.writeUInt16BE(id.length);
      const data = Buffer.concat([digest(rp.rpID), Buffer.from([flags]), Buffer.alloc(4), Buffer.alloc(16), length, id, Buffer.from(cose)]);
      return {
        id: b64(id), rawId: b64(id), type: "public-key", clientExtensionResults: {},
        response: {
          clientDataJSON: b64(client("webauthn.create", options.challenge, rp.origin)),
          attestationObject: b64(encodeCBOR(new Map([
            ["fmt", "none"], ["attStmt", new Map()], ["authData", new Uint8Array(data)],
          ]))),
          transports: ["internal"],
        },
      };
    },
    authentication(options, rp, counter = 1, flags = 0x05) {
      const count = Buffer.alloc(4); count.writeUInt32BE(counter);
      const data = Buffer.concat([digest(rp.rpID), Buffer.from([flags]), count]);
      const json = client("webauthn.get", options.challenge, rp.origin);
      return {
        id: b64(id), rawId: b64(id), type: "public-key", clientExtensionResults: {},
        response: {
          clientDataJSON: b64(json), authenticatorData: b64(data),
          signature: b64(sign("sha256", Buffer.concat([data, digest(json)]), privateKey)),
        },
      };
    },
  };
}

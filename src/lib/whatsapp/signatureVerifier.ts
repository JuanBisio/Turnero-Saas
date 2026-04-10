import { createHmac } from "crypto";

/**
 * Verifica la firma HMAC-SHA256 del webhook de YCloud.
 * Header: "ycloud-signature: t=TIMESTAMP,s=SIGNATURE"
 */
export function verifyYCloudSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string
): boolean {
  // Si el secret no está configurado, permitimos la solicitud pero con un warning
  if (!secret || secret.includes("TODO")) {
    console.warn("[Signature] YCLOUD_WEBHOOK_SECRET no configurado. Saltando verificación.");
    return true; 
  }
  
  if (!signatureHeader) return false;
  
  try {
    const parts = Object.fromEntries(
      signatureHeader.split(",").map(p => {
        const [key, value] = p.split("=");
        return [key.trim(), value.trim()];
      })
    );
    const timestamp = parts["t"];
    const receivedSig = parts["s"];

    if (!timestamp || !receivedSig) return false;

    const payload = `${timestamp}.${rawBody}`;
    const expectedSig = createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    // Comparación robusta
    return receivedSig === expectedSig;
  } catch (err) {
    console.error("[Signature] Error verificando firma:", err);
    return false;
  }
}

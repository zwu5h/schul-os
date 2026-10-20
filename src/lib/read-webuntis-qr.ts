import { parseWebUntisQr } from "./webuntis";

/** Decode locally: neither the QR image nor its contents are uploaded here. */
export async function readWebUntisQrImage(file: File) {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 5 * 1024 * 1024)
    throw new Error("Bitte ein PNG-, JPG- oder WebP-Bild bis 5 MB auswählen.");
  const image = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  try {
    if (image.width * image.height > 20_000_000)
      throw new Error("Das Bild ist zu groß. Bitte nur den QR-Code zuschneiden.");
    const scale = Math.min(1, 1800 / Math.max(image.width, image.height));
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Das Bild konnte nicht gelesen werden. Bitte den QR-Code-Inhalt einfügen.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    const { default: jsQR } = await import("jsqr");
    const decoded = jsQR(pixels.data, pixels.width, pixels.height);
    const credentials = decoded ? parseWebUntisQr(decoded.data) : null;
    if (!credentials) throw new Error("Kein gültiger Untis-Mobile-QR-Code gefunden. Bitte den vollständigen Code aus deinen WebUntis-Freigaben auswählen.");
    return credentials;
  } finally {
    image.close(); canvas.width = 0; canvas.height = 0;
  }
}

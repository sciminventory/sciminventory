const MAX_VENDOR_DOCUMENT_BYTES = 25 * 1024 * 1024;

const CONTENT_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

type VendorDocumentResult =
  | { ok: true; contentType: string; safeName: string }
  | { ok: false; message: string };

export const VENDOR_DOCUMENT_ACCEPT = ".pdf,.docx,.jpg,.jpeg,.png";

export async function validateVendorDocument(file: File, officeOnly = false): Promise<VendorDocumentResult> {
  if (file.size <= 0 || file.size > MAX_VENDOR_DOCUMENT_BYTES) return { ok: false, message: "Upload a supported document no larger than 25 MB." };
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  const contentType = CONTENT_TYPES[extension];
  if (!contentType || (officeOnly && ![".pdf", ".docx"].includes(extension))) return { ok: false, message: officeOnly ? "Upload a PDF or DOCX file." : "Upload a PDF, DOCX, JPG, or PNG file." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (extension === ".pdf" && !startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return { ok: false, message: "The selected PDF is invalid or corrupted." };
  if (extension === ".docx" && !startsWith(bytes, [0x50, 0x4b])) return { ok: false, message: "The selected DOCX file is invalid or corrupted." };
  if ([".jpg", ".jpeg"].includes(extension) && !startsWith(bytes, [0xff, 0xd8, 0xff])) return { ok: false, message: "The selected JPEG is invalid or corrupted." };
  if (extension === ".png" && !startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { ok: false, message: "The selected PNG is invalid or corrupted." };
  return { ok: true, contentType, safeName: file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-120) };
}

function startsWith(bytes: Uint8Array, signature: number[]) {
  return bytes.length >= signature.length && signature.every((value, index) => bytes[index] === value);
}

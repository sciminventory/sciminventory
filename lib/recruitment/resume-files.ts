const MAX_RESUME_BYTES = 10 * 1024 * 1024;

const RESUME_CONTENT_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".txt": "text/plain",
};

type ResumeFileResult =
  | { ok: true; contentType: string; safeName: string }
  | { ok: false; message: string };

export const RESUME_FILE_ACCEPT = [
  ".pdf",
  ".docx",
  ".txt",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
].join(",");

export async function validateResumeFile(file: File): Promise<ResumeFileResult> {
  if (file.size <= 0 || file.size > MAX_RESUME_BYTES) {
    return { ok: false, message: "Upload a PDF, DOCX, or TXT resume no larger than 10 MB." };
  }

  const extensionIndex = file.name.lastIndexOf(".");
  const extension = extensionIndex >= 0 ? file.name.slice(extensionIndex).toLowerCase() : "";
  const contentType = RESUME_CONTENT_TYPES[extension];
  if (!contentType) {
    return { ok: false, message: "Upload a PDF, DOCX, or TXT resume no larger than 10 MB." };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (extension === ".pdf" && !startsWithAscii(bytes, "%PDF-")) {
    return { ok: false, message: "The selected PDF is invalid or corrupted." };
  }
  if (
    extension === ".docx"
    && (!hasZipSignature(bytes) || !containsAscii(bytes, "[Content_Types].xml") || !containsAscii(bytes, "word/"))
  ) {
    return { ok: false, message: "The selected DOCX file is invalid or corrupted." };
  }
  if (extension === ".txt" && bytes.includes(0)) {
    return { ok: false, message: "The selected TXT file is invalid or corrupted." };
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-120);
  return { ok: true, contentType, safeName };
}

function hasZipSignature(bytes: Uint8Array) {
  return bytes.length >= 4
    && bytes[0] === 0x50
    && bytes[1] === 0x4b
    && (
      (bytes[2] === 0x03 && bytes[3] === 0x04)
      || (bytes[2] === 0x05 && bytes[3] === 0x06)
      || (bytes[2] === 0x07 && bytes[3] === 0x08)
    );
}

function startsWithAscii(bytes: Uint8Array, value: string) {
  if (bytes.length < value.length) return false;
  return [...value].every((character, index) => bytes[index] === character.charCodeAt(0));
}

function containsAscii(bytes: Uint8Array, value: string) {
  const target = [...value].map((character) => character.charCodeAt(0));
  outer: for (let start = 0; start <= bytes.length - target.length; start += 1) {
    for (let index = 0; index < target.length; index += 1) {
      if (bytes[start + index] !== target[index]) continue outer;
    }
    return true;
  }
  return false;
}

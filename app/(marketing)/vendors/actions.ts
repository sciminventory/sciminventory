"use server";

import { createHash, randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase/admin";
import { validateVendorDocument } from "@/lib/vendor/document-files";

export type VendorApplicationState = { status: "idle" | "success" | "error"; message: string; reference?: string };

const schema = z.object({
  organizationId: z.uuid(), companyName: z.string().trim().min(2).max(160), legalName: z.string().trim().min(2).max(200),
  contactName: z.string().trim().min(2).max(160), email: z.email(), phone: z.string().trim().max(50),
  category: z.enum(["raw_material", "finished_goods", "spare_parts", "logistics_provider", "services"]),
  taxId: z.string().trim().min(2).max(80), registrationNumber: z.string().trim().min(2).max(80),
  productsServices: z.string().trim().min(10).max(4000), deliveryCapacity: z.coerce.number().min(0),
  deliveryMethods: z.string().max(1000), serviceAreas: z.string().max(1000), address: z.string().trim().min(5).max(500),
  city: z.string().trim().min(2).max(120), website: z.string().trim().max(300), consent: z.literal("on"), websiteCheck: z.string().max(0),
});

function list(value: string) { return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))].slice(0, 50); }

export async function submitVendorApplication(_state: VendorApplicationState, formData: FormData): Promise<VendorApplicationState> {
  const result = schema.safeParse(Object.fromEntries(formData));
  if (!result.success) return { status: "error", message: result.error.issues[0]?.message ?? "Check the application details." };
  if (!hasSupabaseAdminEnv()) return { status: "error", message: "Vendor applications are temporarily unavailable." };
  const data = result.data;
  const documentInputs = [
    { key: "taxDocument", type: "tax_document", title: "Tax registration", required: true },
    { key: "registrationDocument", type: "business_registration", title: "Business registration", required: true },
    { key: "certificationDocument", type: "certification", title: "Vendor certification", required: false },
  ];
  const validatedDocuments: Array<{ file: File; type: string; title: string; contentType: string; safeName: string }> = [];
  for (const input of documentInputs) {
    const file = formData.get(input.key);
    if (!(file instanceof File) || file.size === 0) {
      if (input.required) return { status: "error", message: `Attach the required ${input.title.toLowerCase()} document.` };
      continue;
    }
    if (file.size > 8 * 1024 * 1024) return { status: "error", message: `${input.title}: files must be 8 MB or smaller.` };
    const validation = await validateVendorDocument(file);
    if (!validation.ok) return { status: "error", message: `${input.title}: ${validation.message}` };
    validatedDocuments.push({ file, type: input.type, title: input.title, contentType: validation.contentType, safeName: validation.safeName });
  }
  const admin = createAdminClient();
  const requestHeaders = await headers();
  const address = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "unknown";
  const salt = process.env.PUBLIC_APPLICATION_RATE_LIMIT_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || "local-development";
  const identifierHash = createHash("sha256").update(`${salt}|vendor|${address}|${data.email.toLowerCase()}`).digest("hex");
  const attempts = await admin.from("public_vendor_application_attempts").select("id", { count: "exact", head: true }).eq("identifier_hash", identifierHash).gte("attempted_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());
  if (attempts.error) return { status: "error", message: "The vendor onboarding database update is not installed yet." };
  if ((attempts.count ?? 0) >= 3) return { status: "error", message: "Too many attempts. Please try again in one hour." };
  await admin.from("public_vendor_application_attempts").insert({ identifier_hash: identifierHash });
  const duplicate = await admin.from("suppliers").select("code").eq("organization_id", data.organizationId).eq("contact_email", data.email.toLowerCase()).maybeSingle();
  if (duplicate.data) return { status: "success", message: "We already received an application for this email.", reference: duplicate.data.code };
  const base = data.companyName.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 18) || "VENDOR";
  const code = `${base}-${randomUUID().slice(0, 6).toUpperCase()}`;
  const inserted = await admin.from("suppliers").insert({ organization_id: data.organizationId, code, name: data.companyName, legal_name: data.legalName, contact_email: data.email.toLowerCase(), phone: data.phone || null, vendor_category: data.category, tax_id: data.taxId, registration_number: data.registrationNumber, delivery_capacity: data.deliveryCapacity, delivery_methods: list(data.deliveryMethods), service_areas: list(data.serviceAreas), address_line: data.address, city: data.city, website: data.website || null, notes: `Primary contact: ${data.contactName}\nProducts/services: ${data.productsServices}`, onboarding_status: "submitted", status: "on_hold", currency: "PHP" }).select("id").single();
  if (inserted.error || !inserted.data) return { status: "error", message: "The application could not be submitted. Please try again." };
  const uploadedPaths: string[] = [];
  for (const document of validatedDocuments) {
    const path = `${data.organizationId}/vendors/${inserted.data.id}/applications/${randomUUID()}-${document.safeName}`;
    const upload = await admin.storage.from("organization-documents").upload(path, document.file, { contentType: document.contentType, upsert: false });
    if (upload.error) {
      if (uploadedPaths.length) await admin.storage.from("organization-documents").remove(uploadedPaths);
      await admin.from("suppliers").delete().eq("id", inserted.data.id);
      return { status: "error", message: "The application documents could not be stored. Please try again." };
    }
    uploadedPaths.push(path);
    const metadata = await admin.from("vendor_documents").insert({ organization_id: data.organizationId, supplier_id: inserted.data.id, document_type: document.type, title: document.title, storage_path: path, file_name: document.file.name, mime_type: document.contentType, file_size: document.file.size, status: "submitted", uploaded_by: null });
    if (metadata.error) {
      await admin.storage.from("organization-documents").remove(uploadedPaths);
      await admin.from("suppliers").delete().eq("id", inserted.data.id);
      return { status: "error", message: "The application documents could not be registered. Please try again." };
    }
  }
  await admin.from("notifications").insert({ organization_id: data.organizationId, supplier_id: inserted.data.id, audience: "internal", title: "New vendor application", message: `${data.companyName} submitted credentials for review.`, href: `/dashboard/vendors?vendor=${inserted.data.id}` });
  await admin.from("public_vendor_application_attempts").delete().lt("attempted_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  revalidatePath("/dashboard/vendors");
  return { status: "success", message: "Your vendor application was submitted for review.", reference: code };
}

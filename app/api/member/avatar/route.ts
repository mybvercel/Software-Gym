import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest } from "next/server";

/**
 * Uploads a member's profile photo (sent as a compressed JPEG data URL) to the
 * public "avatars" storage bucket and saves the public URL on their profile,
 * so the trainer can recognize them. Uses the service-role client so members
 * don't need storage RLS policies.
 */
const BUCKET = "avatars";
const MAX_BYTES = 2_000_000; // ~2MB after client-side compression

export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient();
    const { member_id, image } = await request.json();

    if (!member_id || !image)
      return Response.json({ error: "Datos incompletos." }, { status: 400 });

    // Parse the data URL → content type + bytes
    const match = /^data:(image\/(?:png|jpe?g|webp));base64,(.+)$/.exec(image);
    if (!match)
      return Response.json({ error: "Formato de imagen inválido." }, { status: 400 });

    const contentType = match[1];
    const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
    const buffer = Buffer.from(match[2], "base64");
    if (buffer.byteLength > MAX_BYTES)
      return Response.json({ error: "La imagen es muy pesada." }, { status: 413 });

    // Member must exist
    const { data: member } = await admin
      .from("profiles")
      .select("id")
      .eq("id", member_id)
      .single();
    if (!member)
      return Response.json({ error: "Alumno no encontrado." }, { status: 404 });

    // Make sure the bucket exists (no-op if it already does)
    await admin.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: MAX_BYTES,
      allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
    });

    const path = `${member_id}.${ext}`;
    const { error: upErr } = await admin.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType, upsert: true, cacheControl: "3600" });
    if (upErr) {
      console.error("Avatar upload error:", upErr.message);
      return Response.json({ error: "No se pudo subir la foto." }, { status: 500 });
    }

    // Public URL with a cache-busting version so the new photo shows immediately
    const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
    const url = `${pub.publicUrl}?v=${Date.now()}`;

    const { error: updErr } = await admin
      .from("profiles")
      .update({ avatar_url: url })
      .eq("id", member_id);
    if (updErr) {
      console.error("Avatar profile update error:", updErr.message);
      return Response.json({ error: "No se pudo guardar la foto." }, { status: 500 });
    }

    return Response.json({ ok: true, avatar_url: url });
  } catch (err) {
    console.error("Avatar route error:", err);
    return Response.json({ error: "Error inesperado." }, { status: 500 });
  }
}

import { error, json } from "@sveltejs/kit";

export async function GET({
  request,
  params,
  locals: { supabase, safeGetSession, user },
}) {
  const { session } = await safeGetSession();
  if (!session || !user) {
    return error(401, "Unauthorized");
  }
  const url = new URL(request.url);
  const path = url.searchParams.get("path");
  const storagePath = params.pid + "_" + path;

  const { data, error: errorDownload } = await supabase.storage
    .from("avatars")
    .download(storagePath);

  if (errorDownload) {
    throw errorDownload;
  }

  return new Response(data);
}

// upload new avatar
export async function POST({
  request,
  params,
  locals: { supabase, safeGetSession, user },
}) {
  const { session } = await safeGetSession();

  if (!session || !user) {
    return error(401, "Unauthorized");
  }

  const { file: base64, filename, type } = await request.json();
  // conver base64 to file
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
  const buffer = new Buffer(base64Data, "base64");
  const file = new File([buffer], filename, { type: type });

  const { error: errorUploading } = await supabase.storage
    .from("avatars")
    .upload(params.pid + "_" + filename, file);
  if (errorUploading) {
    throw errorUploading;
  }
  console.log("uploaded", filename);

  const { error: errorUpdate } = await supabase
    .from("profiles")
    .update({ avatarUrl: filename })
    .match({ id: params.pid });
  if (errorUpdate) {
    console.log("error updating profile", errorUpdate);
    await supabase.storage
      .from("avatars")
      .remove([params.pid + "_" + filename]);
    throw errorUpdate;
  }

  return json({
    filename,
  });
}

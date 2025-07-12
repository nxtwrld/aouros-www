import { error, type Actions } from "@sveltejs/kit";
import { put } from "@vercel/blob";
import { BLOB_READ_WRITE_TOKEN } from "$env/dynamic/private";

export const actions: Actions = {
  upload: async ({ request }) => {
    const form = await request.formData();
    const file = form.get("image-upload") as File;

    if (!file) {
      error(400, { message: "No file to upload." });
    }

    const { url } = await put(file.name, file, {
      access: "public",
      token: BLOB_READ_WRITE_TOKEN,
    });
    return { uploaded: url };
  },
};

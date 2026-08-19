"use server";

import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function cekPin(token: string, pin: string) {
  const warung = await db.warung.findUnique({
    where: { tokenPemilik: token },
    select: { pin: true },
  });

  if (!warung || warung.pin !== pin) {
    return { success: false, message: "PIN salah" };
  }

  // Set cookie for 30 days
  cookies().set(`pinAuth_${token}`, "true", { maxAge: 60 * 60 * 24 * 30, httpOnly: true });
  return { success: true };
}

export async function ubahPin(token: string, pinBaru: string) {
  if (pinBaru.length !== 4) {
    return { success: false, message: "PIN harus 4 digit" };
  }
  
  await db.warung.update({
    where: { tokenPemilik: token },
    data: { pin: pinBaru },
  });

  cookies().set(`pinAuth_${token}`, "true", { maxAge: 60 * 60 * 24 * 30, httpOnly: true });
  revalidatePath(`/w/${token}`);
  return { success: true };
}

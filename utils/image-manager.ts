"use server";

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export interface ImageMetadata {
  url: string;
  order: number;
  width?: number;
  height?: number;
  fileSize?: number;
  mimeType?: string;
}

export interface UploadedImage {
  path: string;
  width: number;
  height: number;
  fileSize: number;
  mimeType: string;
}

const MAX_IMAGE_DIMENSION = 8000;

export async function uploadImage(
  image: File,
  userId: string,
  index: number = 0,
): Promise<UploadedImage> {
  const buffer = Buffer.from(await image.arrayBuffer());
  const metadata = await sharp(buffer).metadata();

  const needsResize =
    (metadata.width && metadata.width > MAX_IMAGE_DIMENSION) ||
    (metadata.height && metadata.height > MAX_IMAGE_DIMENSION);

  let processedBuffer: Buffer = buffer;
  let finalWidth = metadata.width || 0;
  let finalHeight = metadata.height || 0;

  if (needsResize) {
    console.log(`⚠️ Image ${index} exceeds 8000px limit, resizing...`);

    const aspectRatio = (metadata.width || 1) / (metadata.height || 1);
    let newWidth = metadata.width || 0;
    let newHeight = metadata.height || 0;

    if ((metadata.width || 0) > MAX_IMAGE_DIMENSION) {
      newWidth = MAX_IMAGE_DIMENSION;
      newHeight = Math.round(MAX_IMAGE_DIMENSION / aspectRatio);
    }

    if (newHeight > MAX_IMAGE_DIMENSION) {
      newHeight = MAX_IMAGE_DIMENSION;
      newWidth = Math.round(MAX_IMAGE_DIMENSION * aspectRatio);
    }

    processedBuffer = await sharp(buffer)
      .resize(newWidth, newHeight, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    finalWidth = newWidth;
    finalHeight = newHeight;
  }

  const fileName = `${Date.now()}-${userId}-${index}.jpg`;
  const { data: imageData, error: imageError } = await supabaseAdmin.storage
    .from("images")
    .upload(fileName, processedBuffer, {
      contentType: "image/jpeg",
      cacheControl: "3600",
    });

  if (imageError || !imageData?.path) {
    throw new Error(`Failed to upload image ${index}: ${imageError?.message}`);
  }

  return {
    path: imageData.path,
    width: finalWidth,
    height: finalHeight,
    fileSize: processedBuffer.length,
    mimeType: "image/jpeg",
  };
}

export async function uploadMultipleImages(
  images: File[],
  userId: string,
): Promise<UploadedImage[]> {
  const uploadPromises = images.map((image, index) =>
    uploadImage(image, userId, index),
  );

  return Promise.all(uploadPromises);
}

export async function saveImagesToMessage(
  messageId: number,
  images: UploadedImage[],
): Promise<void> {
  const imageRecords = images.map((img, index) => ({
    message_id: messageId,
    image_url: img.path,
    image_order: index,
    file_size_bytes: img.fileSize,
    mime_type: img.mimeType,
    width: img.width,
    height: img.height,
  }));

  const { error } = await supabaseAdmin
    .from("message_images")
    .insert(imageRecords);

  if (error) {
    console.error("Failed to save images to database:", error);
    throw new Error("Failed to save images metadata");
  }
}

export async function saveImagesToMessageJsonb(
  messageId: number,
  images: UploadedImage[],
): Promise<void> {
  const imagesJson = images.map((img, index) => ({
    url: img.path,
    order: index,
    width: img.width,
    height: img.height,
    fileSize: img.fileSize,
    mimeType: img.mimeType,
  }));

  const { error } = await supabaseAdmin
    .from("messages")
    .update({ prompt_images: imagesJson })
    .eq("id", messageId);

  if (error) {
    console.error("Failed to update message with images:", error);
    throw new Error("Failed to save images to message");
  }
}

export async function getMessageImages(
  messageId: number,
): Promise<ImageMetadata[]> {
  const { data, error } = await supabaseAdmin
    .from("message_images")
    .select("*")
    .eq("message_id", messageId)
    .order("image_order", { ascending: true });

  if (error) {
    console.error("Failed to fetch message images:", error);
    return [];
  }

  return (
    data?.map((img) => ({
      url: img.image_url,
      order: img.image_order,
      width: img.width || undefined,
      height: img.height || undefined,
      fileSize: img.file_size_bytes || undefined,
      mimeType: img.mime_type || undefined,
    })) || []
  );
}

export async function getMessageImagesFromJsonb(
  messageId: number,
): Promise<ImageMetadata[]> {
  const { data, error } = await supabaseAdmin
    .from("messages")
    .select("prompt_images")
    .eq("id", messageId)
    .single();

  if (error || !data) {
    console.error("Failed to fetch message images:", error);
    return [];
  }

  return (data.prompt_images as ImageMetadata[]) || [];
}

export async function deleteMessageImages(messageId: number): Promise<void> {
  const images = await getMessageImages(messageId);

  for (const img of images) {
    await supabaseAdmin.storage.from("images").remove([img.url]);
  }

  const { error } = await supabaseAdmin
    .from("message_images")
    .delete()
    .eq("message_id", messageId);

  if (error) {
    console.error("Failed to delete message images:", error);
  }
}

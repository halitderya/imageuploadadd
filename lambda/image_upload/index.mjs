import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({});

export const handler = async (event) => {
  // CORS headers - her response'ta olmalı
  const corsHeaders = {
    "Content-Type": "application/json",
  };

  // OPTIONS preflight request'i handle et
  if (event.requestContext?.http?.method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: "",
    };
  }

  try {
    const body = JSON.parse(event.body);

    // Base64 gelen image içeriği - her iki field'i de kontrol et
    const base64Image = body.image || body.imageData;
    if (!base64Image) {
      throw new Error("No image data provided");
    }

    // Data URL prefix'ini temizle (data:image/jpeg;base64, kısmını)
    const base64Data = base64Image.replace(/^data:image\/[a-z]+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    const filename = body.fileName || `upload_${Date.now()}.jpg`;

    const params = {
      Bucket: "halit-imageupload-app-2025",
      Key: filename,
      Body: buffer,
      ContentType: body.contentType || "image/jpeg",
    };

    const command = new PutObjectCommand(params);
    await s3.send(command);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: "Upload successful",
        fileName: filename,
        imageUrl: `https://${params.Bucket}.s3.eu-west-2.amazonaws.com/${filename}`,
      }),
    };
  } catch (err) {
    console.error("Upload error:", err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: "Upload failed",
        message: err.message,
      }),
    };
  }
};

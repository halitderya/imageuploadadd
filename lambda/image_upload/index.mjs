import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({});

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);

    // Base64 gelen image içeriği
    const base64Image = body.imageData;
    const buffer = Buffer.from(base64Image, "base64");
    const filename = `upload_${Date.now()}.jpg`;

    const params = {
      Bucket: "halit-imageupload-app-2025",
      Key: filename,
      Body: buffer,
      ContentType: "image/jpeg",
    };

    const command = new PutObjectCommand(params);
    await s3.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Upload successful",
        imageUrl: `https://${params.Bucket}.s3.amazonaws.com/${filename}`,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    };
  } catch (err) {
    console.error("Upload error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Upload failed", err }),
      headers: {
        "Content-Type": "application/json",
      },
    };
  }
};

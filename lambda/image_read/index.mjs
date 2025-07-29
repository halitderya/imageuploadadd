import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

const s3 = new S3Client({ region: "eu-west-2" }); // Londra
const BUCKET_NAME = "halit-imageupload-app-2025";

export const handler = async (event) => {
  try {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
    });

    const data = await s3.send(command);

    const files = (data.Contents || []).map((obj) => ({
      key: obj.Key,
      url: `https://${BUCKET_NAME}.s3.amazonaws.com/${obj.Key}`,
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({ files }),
      headers: { "Content-Type": "application/json" },
    };
  } catch (err) {
    console.error("Error listing images:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to list images" }),
    };
  }
};

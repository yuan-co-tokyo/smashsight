import "server-only";
import { S3Client } from "@aws-sdk/client-s3";

export function storage() {
  const region = process.env.AWS_REGION;
  const bucket = process.env.S3_BUCKET_NAME;
  if (!region || !bucket) throw new Error("AWS_REGION and S3_BUCKET_NAME are required");
  return {
    bucket,
    client: new S3Client({
      region,
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
      // Credentials are resolved by the SDK's default credential chain.
    }),
  };
}

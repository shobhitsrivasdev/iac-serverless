const AWS = require("aws-sdk");
const { Storage } = require("@google-cloud/storage");
const fetch = require("node-fetch");
const mailgun = require("mailgun-js");
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const DOMAIN = "demo.shobhitsrivas.me";
const mg = mailgun({
  apiKey: "b5e10512881b9cc8d36303e5a4c77a68-5d2b1caa-3bc69fb2",
  domain: DOMAIN,
});
console.log("Checking the keys ------------- || -----------");
console.log("GCP_SERVICE_ACCOUNT_KEY", process.env.GCP_PRIVATE_KEY);
console.log("GCS_BUCKET_NAME", process.env.GCS_BUCKET_NAME);
console.log("DYNAMODB_TABLE_NAME", process.env.DYNAMODB_TABLE_NAME);
exports.handler = async function handler(event) {
  try {
    const decodedPrivateKey = Buffer.from(
      process.env.GCP_PRIVATE_KEY,
      "base64"
    ).toString("utf-8");
    const keyFileJson = JSON.parse(decodedPrivateKey);
    const storage = new Storage({
      projectId: "csye6225demo",
      credentials: keyFileJson,
    });

    console.log("EVENT SNS", event.Records[0].Sns);
    console.log("EVENT", event);
    const eventData = JSON.parse(event.Records[0].Sns.Message);
    const releaseUrl = eventData.releaseUrl;
    var recipientEmail = eventData.email;
    const assignmentId = eventData.assignment_id;
    const userId = eventData.user_id;
    console.log("URL:", releaseUrl);
    console.log("EMAIL:", recipientEmail);
    const response = await fetch(releaseUrl);
    if (!response.ok)
      throw new Error(`Failed to download release: ${response.statusText}`);

    const releaseData = await response.buffer();
    const bucketName = process.env.GCS_BUCKET_NAME;
    const fileName = `${userId}/${assignmentId}/file${Date.now().toString()}.zip`;
    await storage.bucket(bucketName).file(fileName).save(releaseData);
    let signedUrl = await generateSignedUrl(storage, bucketName, fileName);
    await sendEmail(
      recipientEmail,
      signedUrl,
      "Download successful",
      `The release was successfully downloaded and uploaded to ${bucketName}`
    );
    await recordEmailEvent(recipientEmail, "success");
  } catch (error) {
    console.error("Error:", error);
    await sendEmail(
      event.email,
      null,
      "Download failed",
      `Error occurred: ${error.message}`
    );
    await recordEmailEvent(recipientEmail, "failure");
  }
};

async function generateSignedUrl(storage, bucketName, fileName) {
  const options = {
    action: "read",
    expires: Date.now() + 15 * 60 * 1000, // 15 minutes
  };

  try {
    const [url] = await storage
      .bucket(bucketName)
      .file(fileName)
      .getSignedUrl(options);
    return url;
  } catch (err) {
    console.error("Error generating signed URL:", err);
    throw err;
  }
}

async function sendEmail(to, url, subject, message) {
  const data = {
    from: "noreply@demo.shobhitsrivas.me",
    to: to,
    subject: subject,
    text: message + url,
  };
  await mg.messages().send(data);
}

async function recordEmailEvent(email, status) {
  const params = {
    TableName: process.env.DYNAMODB_TABLE_NAME,
    Item: {
      id: Date.now().toString(),
      status: status,
      timestamp: new Date().toISOString(),
      email: email,
    },
  };
  await dynamoDB.put(params).promise();
}

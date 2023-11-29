const AWS = require("aws-sdk");
const { Storage } = require("@google-cloud/storage");
const fetch = require("node-fetch");
const mailgun = require("mailgun-js");
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const DOMAIN = process.env.MAILGUN_DOMAIN;
const KEY = process.env.MAILGUN_KEY;
const mg = mailgun({
  apiKey: KEY,
  domain: DOMAIN,
});
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
      fileName,
      "Download successful",
      `The release was successfully downloaded and uploaded to ${bucketName}`,
      "success"
    );
    await recordEmailEvent(recipientEmail, "SUCCESS EMAIL SENT");
  } catch (error) {
    console.error("Error:", error);
    await sendEmail(
      recipientEmail,
      null,
      "Download failed",
      `Error occurred: ${error.message}`,
      "error"
    );
    await recordEmailEvent(recipientEmail, "FAILURE EMAIL SENT");
  }
};

async function generateSignedUrl(storage, bucketName, fileName) {
  const options = {
    action: "read",
    expires: Date.now() + 15 * 60 * 1000,
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

async function sendEmail(to, url, subject, message, status) {
  const data = {
    from: "noreply@demo.shobhitsrivas.me",
    to: to,
    subject: subject,
    html:
      status == "success"
        ? `
    <html>
      <head>
      </head>
      <body>
        <p>Hello,</p>
        <p>Please click on the below link to download your assignment:</p>
        <p><b>${url}</b></p>
        <p>We're glad you're here!</p>
        <p>Thank you</p>
        <p>Shobhit</p>
      </body>
    </html>
  `
        : message,
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

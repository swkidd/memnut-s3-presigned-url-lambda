const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");

const BUCKET_NAME = process.env["BUCKET_NAME"];

const s3 = new AWS.S3();

exports.handler = async (event) => {
  const requestContext = event.requestContext;
  try {
    const body = JSON.parse(event.body);
    const fileType = body.fileType;
    const claims = requestContext.authorizer.jwt.claims;
    const email = claims.email;
    
    if (!email) {
      throw new Error("invalid request");
    }
    
    if (
      !(
        fileType === "image/jpeg" ||
        fileType === "image/png" ||
        fileType === "image/webp"
      )
    ) {
      throw new Error("invalid request");
    }

    const imageId = uuidv4()

    const fields = {
      key: email,
      "Content-Type": fileType,
      "Cache-Control": "public",
      "x-amz-meta-email": email,
      "x-amz-meta-imageId": imageId,
      "x-amz-meta-imageKey": `${imageId}.webp`, 
    };

    let params = {
      Bucket: BUCKET_NAME,
      Expires: 300,
      Fields: fields,
      Conditions: [
        ["content-length-range", 0, 20971520],
        { "Content-Type": fileType },
      ],
    };

    let data = await createPresignedPostPromise(params);

    return {
      statusCode: 200,
      body: JSON.stringify({ data }),
    };
  } catch (error) {
    return {
      statusCode: 400,
    };
  }
};

function createPresignedPostPromise(params) {
  return new Promise((resolve, reject) => {
    s3.createPresignedPost(params, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

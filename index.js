const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");

const BUCKET_NAME = process.env["BUCKET_NAME"];

const s3 = new AWS.S3();

exports.handler = async (event) => {
  const requestContext = event.requestContext;
  try {
    const body = JSON.parse(event.body);
    const type = body.type;
    const fileType = body.fileType;
    const claims = requestContext.authorizer.jwt.claims;
    const email = claims.email;
    const creator = ((u) => ({
      name: u.name,
      family_name: u.family_name,
      given_name: u.given_name,
      picture: u.picture,
    }))(claims);

    if (
      !(
        fileType === "image/jpeg" ||
        fileType === "image/png" ||
        fileType === "image/webp"
      )
    ) {
      throw new Error("invalid request");
    }

    if (!creator.name || !email || !type) {
      throw new Error("invalid request");
    }

    let fields = {
      key: email,
      "Content-Type": fileType,
      "Cache-Control": "public",
      "x-amz-meta-type": type,
      "x-amz-meta-creator": JSON.stringify(creator),
    };

    if (type === "marker") {
      const markerid = body.markerid || uuidv4();
      const latlng = body.latlng;
      fields["x-amz-meta-markerid"] = markerid;
      fields["x-amz-meta-latlng"] = JSON.stringify(latlng);
    } else if (type === "mem") {
      const memageid = body.memageid || uuidv4();
      fields["x-amz-meta-memageid"] = memageid;
    }

    let params = {
      Bucket: BUCKET_NAME,
      Fields: fields,
      Expires: 300,
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

const AWS = require('aws-sdk');
const { "v4": uuidv4 } = require('uuid');

const BUCKET_NAME = process.env['BUCKET_NAME'];

const s3 = new AWS.S3();

exports.handler = async event => {
  const requestContext = event.requestContext
  try {
    const body = JSON.parse(event.body)
    const markerid = body.markerid || uuidv4()
    const latlng = body.latlng
    const claims = requestContext.authorizer.jwt.claims
    const email = claims.email
    const creator = (u => ({
      name: u.name,
      family_name: u.family_name,
      given_name: u.given_name,
      picture: u.picture,
    }))(claims)

    if (!latlng || !creator || !email) {
      throw new Error("invalid request")
    }
    let params = {
      Bucket: BUCKET_NAME,
      Fields: {
        key: email,
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public',
        'x-amz-meta-markerid': markerid,
        'x-amz-meta-latlng': JSON.stringify(latlng),
        'x-amz-meta-creator': JSON.stringify(creator)
      },
      Expires: 300,
      Conditions: [
        ["content-length-range", 0, 20971520],
        { 'Content-Type': 'image/jpeg' }
      ]
    };

    let data = await createPresignedPostPromise(params);

    return {
      statusCode: 200,
      body: JSON.stringify({ data }),
    };
  }
  catch (error) {
    return {
      statusCode: 400,
    }

  }
};

function createPresignedPostPromise(params) {
  return new Promise((resolve, reject) => {
    s3.createPresignedPost(params, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    })
  });
}

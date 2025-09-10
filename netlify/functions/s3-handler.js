import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.MY_AWS_REGION,
  credentials: {
    accessKeyId: process.env.MY_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.MY_AWS_SECRET_ACCESS_KEY,
  },
});

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: JSON.stringify({ message: 'OK' })
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { fileName, fileBody, contentType } = JSON.parse(event.body);
    const bucketName = process.env.MY_AWS_S3_BUCKET_NAME;
    
    if (!fileName || !fileBody || !contentType || !bucketName) {
      throw new Error('Faltan parámetros: se requiere fileName, fileBody, contentType y bucketName.');
    }

    // El fileBody viene como un array de números, lo convertimos a Buffer
    const body = Buffer.from(fileBody);

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      Body: body,
      ContentType: contentType,
      ACL: 'public-read',
    });

    await s3Client.send(command);
    const fileUrl = `https://${bucketName}.s3.${process.env.MY_AWS_REGION}.amazonaws.com/${fileName}`;

    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ message: 'Archivo subido exitosamente a S3.', fileUrl }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
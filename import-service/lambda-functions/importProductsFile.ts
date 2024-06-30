import {
    APIGatewayProxyEvent,
    APIGatewayProxyHandler,
    APIGatewayProxyResult,
} from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({ region: 'eu-central-1' });

const BUCKET_NAME = process.env.BUCKET_NAME;

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log(event);

    const fileName = event.queryStringParameters?.name;

    if (!fileName) {
        return {
            statusCode: 400,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET",
                "Access-Control-Allow-Headers": "Content-Type",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ message: "File name is required" })
        }
    }

    const params = {
        Bucket: BUCKET_NAME,
        Key: `uploaded/${fileName}`,
        Expiration: 60,
    };

    try {
        const command = new PutObjectCommand(params);
        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET",
                "Access-Control-Allow-Headers": "Content-Type",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ url: signedUrl }),
        };
    } catch (error) {
        console.error('Error creating signed URL:', error);
        let errorMessage = 'Could not create signed URL';

        if (error instanceof Error) {
            errorMessage = error.message;
        }

        return {
            statusCode: 500,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET",
                "Access-Control-Allow-Headers": "Content-Type",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ message: errorMessage }),
        };
    };
}
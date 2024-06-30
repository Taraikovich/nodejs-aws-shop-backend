import { S3Event, S3Handler } from 'aws-lambda';
import {
    S3Client,
    GetObjectCommand,
    CopyObjectCommand,
    DeleteObjectCommand
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import csvParser from 'csv-parser';

const s3Client = new S3Client({ region: 'eu-central-1' });

export const handler: S3Handler = async (event: S3Event): Promise<void> => {
    const bucket = event.Records[0].s3.bucket.name;
    const key = event.Records[0].s3.object.key;

    console.log('Event: ', event);

    if (!key.startsWith('uploaded/')) {
        console.log('File is not in the uploaded folder. Skipping...');
        return;
    }

    try {
        const GetObjectParams = {
            Bucket: bucket,
            Key: key
        };

        const getObjectCommand = new GetObjectCommand(GetObjectParams);
        const { Body } = await s3Client.send(getObjectCommand);

        if (!Body || !(Body instanceof Readable)) {
            throw new Error('Failed to get object body');
        }

        const records: any[] = [];
        await new Promise<void>((resolve, reject) => {
            Body.pipe(csvParser())
                .on('data', (data) => {
                    console.log('Parsed record:', data);
                    records.push(data);
                })
                .on('end', async () => {
                    try {
                        console.log('CSV file parsed successfully.');

                        const copyObjectParams = {
                            Bucket: bucket,
                            CopySource: `${bucket}/${key}`,
                            Key: key.replace('uploaded/', 'parsed/'),
                        };

                        const copyObjectCommand = new CopyObjectCommand(copyObjectParams);
                        await s3Client.send(copyObjectCommand);

                        const deleteObjectParams = {
                            Bucket: bucket,
                            Key: key,
                        };

                        const deleteObjectCommand = new DeleteObjectCommand(deleteObjectParams);
                        await s3Client.send(deleteObjectCommand);

                        console.log('File moved to parsed folder and deleted from uploaded folder.');
                        resolve();
                    } catch (err) {
                        reject(err);
                    }
                })
                .on('error', (err) => {
                    reject(err);
                });
        });
    } catch (error) {
        console.error('Error processing S3 event:', error);
        throw error;
    }
}
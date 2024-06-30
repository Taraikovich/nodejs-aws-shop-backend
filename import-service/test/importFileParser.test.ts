import { S3Event, Context, Callback } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import {
    S3Client,
    GetObjectCommand,
    CopyObjectCommand,
    DeleteObjectCommand,
    S3ClientConfig,
    S3ServiceException
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import csvParser from 'csv-parser';
import { handler } from '../lambda-functions/importFileParser';

const s3Mock = mockClient(S3Client);

beforeEach(() => {
  s3Mock.reset();
});

const context = {} as Context;
const callback: Callback<void> = () => {};

const createS3Event = (key: string): S3Event => ({
  Records: [
    {
      s3: {
        bucket: { name: 'test-bucket' },
        object: { key },
      },
    },
  ],
} as S3Event);

const mockReadStream = (data: string): Readable => {
  const stream = new Readable();
  stream._read = () => {}; // No-op
  stream.push(data);
  stream.push(null);
  return stream;
};

it('should skip files not in the uploaded folder', async () => {
  const event = createS3Event('not_uploaded/test.csv');
  const result = await handler(event, context, callback);
  expect(result).toBeUndefined();
});

it('should process and move files from uploaded to parsed folder', async () => {
  const event = createS3Event('uploaded/test.csv');

  const mockBody = mockReadStream('field1,field2\nvalue1,value2\n');

  s3Mock.on(GetObjectCommand).resolves({ Body: mockBody as any });
  s3Mock.on(CopyObjectCommand).resolves({});
  s3Mock.on(DeleteObjectCommand).resolves({});

  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

  await handler(event, context, callback);

  expect(logSpy).toHaveBeenCalledWith('CSV file parsed successfully.');
  expect(logSpy).toHaveBeenCalledWith('File moved to parsed folder and deleted from uploaded folder.');

  logSpy.mockRestore();
});

it('should handle errors during processing', async () => {
  const event = createS3Event('uploaded/test.csv');

  s3Mock.on(GetObjectCommand).rejects(new Error('Failed to get object'));

  const logSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

  await expect(handler(event, context, callback)).rejects.toThrow('Failed to get object');

  expect(logSpy).toHaveBeenCalledWith('Error processing S3 event:', expect.any(Error));

  logSpy.mockRestore();
});

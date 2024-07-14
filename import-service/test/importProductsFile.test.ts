import { APIGatewayProxyEvent, Context, Callback, APIGatewayProxyResult } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { handler } from '../lambda-functions/importProductsFile';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Mock the getSignedUrl function
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

const s3Mock = mockClient(S3Client);

beforeEach(() => {
  s3Mock.reset();
});

const context = {} as Context;
const callback: Callback<APIGatewayProxyResult> = () => {};

it('should return 400 if no file name is provided', async () => {
  const event = { queryStringParameters: {} } as unknown as APIGatewayProxyEvent;
  const result = await handler(event, context, callback) as APIGatewayProxyResult;

  expect(result.statusCode).toBe(400);
  expect(JSON.parse(result.body)).toEqual({ message: 'File name is required' });
});

it('should return a signed URL if file name is provided', async () => {
  const event = { queryStringParameters: { name: 'test.csv' } } as unknown as APIGatewayProxyEvent;
  const signedUrl = 'https://signed-url';

  (getSignedUrl as jest.Mock).mockResolvedValueOnce(signedUrl);

  s3Mock.on(PutObjectCommand).resolves({
    $metadata: { httpStatusCode: 200 },
  });

  const result = await handler(event, context, callback) as APIGatewayProxyResult;

  expect(result.statusCode).toBe(200);
  expect(JSON.parse(result.body)).toEqual({ url: signedUrl });
});

import { handler } from '../lambda-functions/catalogBatchProcess';
import { Context, SQSEvent, SQSRecord } from 'aws-lambda';

describe('handler', () => {
    it('should handle SQS events correctly', async () => {
        const sqsRecord: SQSRecord = {
            messageId: '123',
            receiptHandle: 'abc',
            body: JSON.stringify({
                title: 'Test Product',
                description: 'Test Description',
                price: 10.99,
                count: 100
            }),
            attributes: {
                ApproximateReceiveCount: '1',
                SentTimestamp: '1234567890123'
                ,

                SenderId: '',
                ApproximateFirstReceiveTimestamp: ''
            },
            messageAttributes: {
                MyCustomAttribute: {
                    stringValue: 'custom value',
                    dataType: 'String'
                }
            },
            awsRegion: 'eu-central-1',
            eventSourceARN: 'arn:aws:sqs:eu-central-1:123456789012:queueName'
            ,
            md5OfBody: '',
            eventSource: ''
        };

        const event: SQSEvent = {
            Records: [sqsRecord]
        };

        const context: Context = {} as Context;
        const callback = jest.fn();
        await handler(event, context, callback);

    });
});

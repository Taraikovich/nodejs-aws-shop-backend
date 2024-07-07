import { SQSEvent, SQSHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { randomUUID } from 'crypto';
import { IProduct } from "./product.interface";

const client = new DynamoDBClient({ region: 'eu-central-1' });
const dynamoDB = DynamoDBDocumentClient.from(client);
const snsClient = new SNSClient({ region: 'eu-central-1' });

const PRODUCTS_TABLE_NAME = process.env.PRODUCTS_TABLE_NAME;
const STOCKS_TABLE_NAME = process.env.STOCKS_TABLE_NAME;
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN;

export const handler: SQSHandler = async (event: SQSEvent): Promise<void> => {
    console.log("Received SQS event:", JSON.stringify(event, null, 2));

    for (const record of event.Records) {
        try {
            const { title, description, price, count } = JSON.parse(record.body);

            if (!title || !description || typeof Number(price) !== 'number' || typeof Number(count) !== 'number') {
                console.error("Invalid input:", record.body);
                continue;
            }

            const productId = randomUUID();

            const newProduct: IProduct = {
                id: productId,
                title,
                description,
                price: Number(price)
            };

            const newStock = {
                product_id: productId,
                count: Number(count)
            };

            await dynamoDB.send(new TransactWriteCommand({
                TransactItems: [
                    {
                        Put: {
                            TableName: PRODUCTS_TABLE_NAME,
                            Item: newProduct
                        }
                    },
                    {
                        Put: {
                            TableName: STOCKS_TABLE_NAME,
                            Item: newStock
                        }
                    }
                ]
            }));

            const snsMessage = {
                Subject: 'New Product Created',
                Message: JSON.stringify({
                    product: newProduct,
                    stock: newStock
                }),
                TopicArn: SNS_TOPIC_ARN,
                MessageAttributes: {
                    price: {
                      DataType: 'Number',
                      StringValue: String(price)
                    }
                  }
            };

            await snsClient.send(new PublishCommand(snsMessage));
            console.log(`Product created: ${JSON.stringify(newProduct)}`);
        } catch (error) {
            console.error("Error processing SQS record:", error);
        };
    };
};

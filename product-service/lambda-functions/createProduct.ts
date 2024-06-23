import {
    APIGatewayProxyEvent,
    APIGatewayProxyHandler,
    APIGatewayProxyResult
} from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from 'node:crypto'
import { IProduct } from "./product.interface";

const client = new DynamoDBClient({ region: 'eu-central-1' });
const dynamoDB = DynamoDBDocumentClient.from(client);

const PRODUCTS_TABLE_NAME = process.env.PRODUCTS_TABLE_NAME;
const STOCKS_TABLE_NAME = process.env.STOCKS_TABLE_NAME;

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log(event);
    try {
        const { title, description, price, count } = JSON.parse(event.body || '{}');

        if (!title || !description || typeof price !== 'number' || typeof count !== 'number') {
            return {
                statusCode: 400,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "POST",
                    "Access-Control-Allow-Headers": "Content-Type",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    "message": "Invalid input. Title (string), description (string), price (number), and count (integer) are required."
                }
                )
            }
        }

        const productId = randomUUID();

        const newProduct: IProduct = {
            id: productId,
            title,
            description,
            price
        }

        const newStock = {
            product_id: productId,
            count: count
        }

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

        newProduct.count = newStock.count

        return {
            statusCode: 201,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST",
                "Access-Control-Allow-Headers": "Content-Type",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(newProduct)
        }

    } catch (error) {

        let errorMessage = "Could not create product";
        if (error instanceof Error) {
            errorMessage = error.message;
        }

        return {
            statusCode: 500,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST",
                "Access-Control-Allow-Headers": "Content-Type",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ message: errorMessage }),
        };
    }
}
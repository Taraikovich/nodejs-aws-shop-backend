import {
    APIGatewayProxyEvent,
    APIGatewayProxyHandler,
    APIGatewayProxyResult,
} from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { IProduct } from "./product.interface";

const client = new DynamoDBClient({ region: 'eu-central-1' });
const dynamoDB = DynamoDBDocumentClient.from(client);

const PRODUCTS_TABLE_NAME = process.env.PRODUCTS_TABLE_NAME;
const STOCKS_TABLE_NAME = process.env.STOCKS_TABLE_NAME;

export const handler: APIGatewayProxyHandler = async (
    event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
    console.log(event);

    try {
        const productsData = await dynamoDB.send(new ScanCommand({ TableName: PRODUCTS_TABLE_NAME }));
        const products: IProduct[] = productsData.Items as IProduct[];

        if (!products.length) {
            return {
                statusCode: 404,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET",
                    "Access-Control-Allow-Headers": "Content-Type",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ message: "No products found" }),
            };
        }

        for (const product of products) {

            const stockData = await dynamoDB.send(new GetCommand({
                TableName: STOCKS_TABLE_NAME,
                Key: { product_id: product.id }
            }));

            product.count = stockData.Item ? stockData.Item.count : 0;
        }

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET",
                "Access-Control-Allow-Headers": "Content-Type",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(products),
        };

    } catch (error) {
        let errorMessage = "Could not fetch products";
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
            body: JSON.stringify({ message: errorMessage })
        }
    }
};
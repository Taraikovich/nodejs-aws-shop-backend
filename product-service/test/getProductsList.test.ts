import {
    APIGatewayProxyEvent,
    APIGatewayProxyResult,
    Context,
} from "aws-lambda";
import { handler } from "../lambda-functions/getProductsList";
import { products } from "../lambda-functions/products";

const createMockEvent = (): APIGatewayProxyEvent => ({} as any);

const createMockContext = (): Context => ({} as Context);

describe("getProductsList lambda function", (): void => {
    beforeEach((): void => {
        process.env.MOCK_PRODUCTS = JSON.stringify(products);
    });

    afterEach((): void => {
        delete process.env.MOCK_PRODUCTS;
    });

    it("should return status 200 and a list of all products", async (): Promise<void> => {
        const event = createMockEvent();
        const context = createMockContext();
        const result = (await handler(
            event,
            context,
            () => {},
        )) as APIGatewayProxyResult;

        expect(result.statusCode).toBe(200);
        expect(result.body).toBe(JSON.stringify(products));
        expect(result.headers).toEqual({
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET",
            "Access-Control-Allow-Headers": "Content-Type",
            "Content-Type": "application/json",
        });
    });

    it("should return status 404 if products are not found", async (): Promise<void> => {
        process.env.MOCK_PRODUCTS = "[]";
        const event = createMockEvent();
        const context = createMockContext();
        const result = (await handler(
            event,
            context,
            (): void => {},
        )) as APIGatewayProxyResult;

        expect(result.statusCode).toBe(404);
        expect(result.body).toBe(JSON.stringify({ message: "No products found" }));
        expect(result.headers).toEqual({
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET",
            "Access-Control-Allow-Headers": "Content-Type",
            "Content-Type": "application/json",
        });
    });
});

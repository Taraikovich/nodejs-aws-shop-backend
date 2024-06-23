import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { products } from '../lambda-functions/products';

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const productTabele = dynamodb.Table.fromTableName(this, 'ProductsTable', 'products');
    const stocksTable = dynamodb.Table.fromTableName(this, 'StocksTable', 'stocks');

    const createProductFunction = new lambda.Function(this, 'createProductHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('lambda-functions'),
      handler: 'createProduct.handler',
      environment: {
        MOCK_PRODUCTS: JSON.stringify(products),
        PRODUCTS_TABLE_NAME: productTabele.tableName,
        STOCKS_TABLE_NAME: stocksTable.tableName,
      },
    });

    productTabele.grantWriteData(createProductFunction);
    stocksTable.grantWriteData(createProductFunction);

    const getProductsListFunction = new lambda.Function(this, 'GetProductsListHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('lambda-functions'),
      handler: 'getProductsList.handler',
      environment: {
        MOCK_PRODUCTS: JSON.stringify(products),
        PRODUCTS_TABLE_NAME: productTabele.tableName,
        STOCKS_TABLE_NAME: stocksTable.tableName,
      },
    });

    productTabele.grantReadData(getProductsListFunction);
    stocksTable.grantReadData(getProductsListFunction);

    const getProductByIdFunction = new lambda.Function(this, 'GetProductByIdHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('lambda-functions'),
      handler: 'getProductById.handler',
      environment: {
        MOCK_PRODUCTS: JSON.stringify(products),
        PRODUCTS_TABLE_NAME: productTabele.tableName,
        STOCKS_TABLE_NAME: stocksTable.tableName,
      },
    });

    productTabele.grantReadData(getProductByIdFunction);
    stocksTable.grantReadData(getProductByIdFunction);

    const api = new apigateway.HttpApi(this, 'ProductsApi', {
      description: 'This service serves products',
      corsPreflight: {
        allowHeaders: ['*'],
        allowMethods: [apigateway.CorsHttpMethod.GET, apigateway.CorsHttpMethod.OPTIONS],
        allowOrigins: ['*'],
      },
    });

    api.addRoutes({
      path: '/products',
      methods: [apigateway.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration('GetProductsListIntegration', getProductsListFunction),
    });

    api.addRoutes({
      path: '/products/{id}',
      methods: [apigateway.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration('GetProductByIdIntegration', getProductByIdFunction),
    });

    api.addRoutes({
      path: '/products',
      methods: [apigateway.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration('createProductIntegration', createProductFunction),
    });

    new apigateway.HttpStage(this, 'ProdStage', {
      httpApi: api,
      stageName: 'prod',
      autoDeploy: true,
    });
  }
}

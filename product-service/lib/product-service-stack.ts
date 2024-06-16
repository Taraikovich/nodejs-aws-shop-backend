import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { products } from '../lambda-functions/products';

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const getProductsListFunction = new lambda.Function(this, 'GetProductsListHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('lambda-functions'),
      handler: 'getProductsList.handler',
      environment: {
        MOCK_PRODUCTS: JSON.stringify(products),
      },
    });

    const getProductByIdFunction = new lambda.Function(this, 'GetProductByIdHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('lambda-functions'),
      handler: 'getProductById.handler',
      environment: {
        MOCK_PRODUCTS: JSON.stringify(products),
      },
    });

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

    new apigateway.HttpStage(this, 'ProdStage', {
      httpApi: api,
      stageName: 'prod',
      autoDeploy: true,
    });
  }
}

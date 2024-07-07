import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations'
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const catalogItemsQueue = new sqs.Queue(this, 'catalogItemsQueue', {
      visibilityTimeout: cdk.Duration.seconds(300),
      receiveMessageWaitTime: cdk.Duration.seconds(20)
    })

    const productTabele = dynamodb.Table.fromTableName(this, 'ProductsTable', 'products');
    const stocksTable = dynamodb.Table.fromTableName(this, 'StocksTable', 'stocks');

    const bucket = s3.Bucket.fromBucketName(this, 'ImportBucket', 'import-service-rsschool-task-5');

    const createProductTopic = new sns.Topic(this, 'CreateProductTopic', {
      displayName: 'Create Product Topic'
    });

    createProductTopic.addSubscription(new subs.EmailSubscription('taraikovi4@gmail.com', {
      filterPolicy: {
        price: sns.SubscriptionFilter.numericFilter({
          between: { start: 100, stop: 200 },
          // greaterThan: 300,
        }),
      },
    }));

    createProductTopic.addSubscription(new subs.EmailSubscription('1033837@gmail.com'));

    const importProductsFileLambda = new lambda.Function(this, 'importProductsFile', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'importProductsFile.handler',
      code: lambda.Code.fromAsset('dist'),
      environment: {
        BUCKET_NAME: bucket.bucketName,
        CATALOG_ITEMS_QUEUE_URL: catalogItemsQueue.queueUrl
      }
    })

    bucket.grantPut(importProductsFileLambda);

    importProductsFileLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: ['s3:PutObject'],
      resources: [`${bucket.bucketArn}/uploaded/*`]
    }));

    const importFileParserLambda = new lambda.Function(this, 'importFileParserLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'importFileParser.handler',
      code: lambda.Code.fromAsset('dist'),
      environment: {
        BUCKET_NAME: bucket.bucketName,
        CATALOG_ITEMS_QUEUE_URL: catalogItemsQueue.queueUrl,
      },
    });

    bucket.grantReadWrite(importFileParserLambda);
    catalogItemsQueue.grantSendMessages(importFileParserLambda);

    bucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3n.LambdaDestination(importFileParserLambda), {
      prefix: 'uploaded/'
    })

    const catalogBatchProcessLambda = new lambda.Function(this, 'catalogBatchProcessLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'catalogBatchProcess.handler',
      code: lambda.Code.fromAsset('dist'),
      environment: {
        PRODUCTS_TABLE_NAME: productTabele.tableName,
        STOCKS_TABLE_NAME: stocksTable.tableName,
        SNS_TOPIC_ARN: createProductTopic.topicArn
      },
    });

    productTabele.grantWriteData(catalogBatchProcessLambda);
    stocksTable.grantWriteData(catalogBatchProcessLambda);
    createProductTopic.grantPublish(catalogBatchProcessLambda);

    catalogBatchProcessLambda.addEventSource(
      new SqsEventSource(catalogItemsQueue, {
        batchSize: 5
      }));

    const api = new apigateway.HttpApi(this, 'HttpApi');

    api.addRoutes({
      path: '/import',
      methods: [apigateway.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration('LambdaIntegration', importProductsFileLambda)
    });

    new cdk.CfnOutput(this, 'HTTP API URL', {
      value: api.url ?? 'Something went wrong with the deploy'
    });

    new apigateway.HttpStage(this, 'ProdStage', {
      httpApi: api,
      stageName: 'prod',
      autoDeploy: true,
    });
  }
}

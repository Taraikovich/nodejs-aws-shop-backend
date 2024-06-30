import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations'
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = s3.Bucket.fromBucketName(this, 'ImportBucket', 'import-service-rsschool-task-5');

    const importProductsFileLambda = new lambda.Function(this, 'importProductsFile', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'importProductsFile.handler',
      code: lambda.Code.fromAsset('dist'),
      environment: {
        BUCKET_NAME: bucket.bucketName
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
        BUCKET_NAME: bucket.bucketName
      },
      
    });

    bucket.grantReadWrite(importFileParserLambda);

    bucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3n.LambdaDestination(importFileParserLambda), {
        prefix: 'uploaded/'
    })

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

import { APIGatewayTokenAuthorizerEvent, APIGatewayAuthorizerResult, PolicyDocument } from 'aws-lambda';

export const handler = async (event: APIGatewayTokenAuthorizerEvent): Promise<APIGatewayAuthorizerResult> => {
    console.log("Event", JSON.stringify(event));

    const authorizationToken = event.authorizationToken;

    if (!authorizationToken) {
        return generatePolicy('user', 'Deny', event.methodArn, 401);
    }

    const encodedCredentials = authorizationToken.split(' ')[1];
    const [username, password] = Buffer.from(encodedCredentials, 'base64').toString('utf-8').split(':');

    console.log("Received username:", username);
    console.log("Received password:", password);

    const validPassword = process.env[username];

    if (validPassword && validPassword === password) {
        return generatePolicy(username, 'Allow', event.methodArn);
    } else {
        return generatePolicy(username, 'Deny', event.methodArn, 403);
    }
};

function generatePolicy(principalId: string, effect: 'Allow' | 'Deny', resource: string, statusCode: number = 200): APIGatewayAuthorizerResult {
    const policyDocument: PolicyDocument = {
        Version: '2012-10-17',
        Statement: [
            {
                Action: 'execute-api:Invoke',
                Effect: effect,
                Resource: resource
            }
        ]
    };

    const authResponse = {
        principalId,
        policyDocument,
        context: {
            statusCode: statusCode.toString()
        }
    };

    console.log("Generated policy:", JSON.stringify(authResponse));
    return authResponse;
}

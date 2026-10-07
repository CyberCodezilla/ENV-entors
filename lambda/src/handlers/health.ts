import { APIGatewayProxyHandlerV2 } from 'aws-lambda';

export const handler: APIGatewayProxyHandlerV2 = async () => {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'ok',
      service: 'heatflood-guardian',
      timestamp: new Date().toISOString(),
      version: process.env.SERVICE_VERSION ?? '0.1.0',
      region: process.env.AWS_REGION ?? 'unknown',
      sagemakerEnabled: process.env.SAGEMAKER_ENABLED === 'true',
    }),
  };
};

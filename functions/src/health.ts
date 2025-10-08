import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

/**
 * Health check endpoint
 * Returns the status of the function app and SignalR service connectivity
 */
export async function health(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('Health check triggered');

    const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'signalr-serverless-functions',
        version: '1.0.0',
        checks: {
            functions: 'ok',
            signalr: process.env.AzureSignalRConnectionString ? 'configured' : 'not configured'
        }
    };

    return {
        status: 200,
        jsonBody: healthStatus
    };
}

app.http('health', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: health
});

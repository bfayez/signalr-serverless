import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

/**
 * Negotiate function - provides SignalR connection info to clients
 * This is the entry point for SignalR clients to get connection details
 */
export async function negotiate(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('Negotiate function triggered');

    // The SignalR binding automatically provides connection info
    // This will be returned from the SignalR input binding
    return {
        status: 200,
        headers: {
            'Content-Type': 'application/json'
        }
    };
}

app.http('negotiate', {
    methods: ['POST', 'GET'],
    authLevel: 'anonymous',
    extraInputs: [
        {
            type: 'signalRConnectionInfo',
            name: 'connectionInfo',
            hubName: 'chat',
            connectionStringSetting: 'AzureSignalRConnectionString'
        }
    ],
    handler: async (request: HttpRequest, context: InvocationContext) => {
        const connectionInfo = context.extraInputs.get('connectionInfo');
        return {
            status: 200,
            jsonBody: connectionInfo
        };
    }
});

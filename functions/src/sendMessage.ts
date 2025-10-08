import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

/**
 * Send message to a specific group
 * Endpoint: POST /api/messages
 * Body: { groupName: string, message: string, sender: string }
 */
export async function sendMessage(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('SendMessage function triggered');

    try {
        const body = await request.json() as { groupName: string; message: string; sender: string };
        
        if (!body.groupName || !body.message || !body.sender) {
            return {
                status: 400,
                jsonBody: { error: 'Missing required fields: groupName, message, sender' }
            };
        }

        context.log(`Sending message to group ${body.groupName} from ${body.sender}`);

        const signalRMessage = {
            target: 'newMessage',
            arguments: [{
                sender: body.sender,
                message: body.message,
                timestamp: new Date().toISOString()
            }]
        };

        context.extraOutputs.set('signalRMessages', signalRMessage);

        return {
            status: 200,
            jsonBody: { 
                success: true,
                message: 'Message sent successfully'
            }
        };
    } catch (error) {
        context.error('Error sending message:', error);
        return {
            status: 500,
            jsonBody: { error: 'Failed to send message' }
        };
    }
}

app.http('sendMessage', {
    methods: ['POST'],
    authLevel: 'anonymous',
    extraOutputs: [
        {
            type: 'signalR',
            name: 'signalRMessages',
            hubName: 'chat',
            connectionStringSetting: 'AzureSignalRConnectionString'
        }
    ],
    handler: async (request: HttpRequest, context: InvocationContext) => {
        const body = await request.json() as { groupName: string; message: string; sender: string };
        
        if (!body.groupName || !body.message || !body.sender) {
            return {
                status: 400,
                jsonBody: { error: 'Missing required fields: groupName, message, sender' }
            };
        }

        context.log(`Sending message to group ${body.groupName} from ${body.sender}`);

        const signalRMessage = {
            groupName: body.groupName,
            target: 'newMessage',
            arguments: [{
                sender: body.sender,
                message: body.message,
                timestamp: new Date().toISOString()
            }]
        };

        context.extraOutputs.set('signalRMessages', signalRMessage);

        return {
            status: 200,
            jsonBody: { 
                success: true,
                message: 'Message sent successfully'
            }
        };
    }
});

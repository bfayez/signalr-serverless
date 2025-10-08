import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

/**
 * Remove user from a group
 * Endpoint: POST /api/groups/leave
 * Body: { groupName: string, userId: string }
 */
export async function leaveGroup(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('LeaveGroup function triggered');

    try {
        const body = await request.json() as { groupName: string; userId: string };
        
        if (!body.groupName || !body.userId) {
            return {
                status: 400,
                jsonBody: { error: 'Missing required fields: groupName, userId' }
            };
        }

        context.log(`Removing user ${body.userId} from group ${body.groupName}`);

        const groupAction = {
            userId: body.userId,
            groupName: body.groupName,
            action: 'remove'
        };

        context.extraOutputs.set('signalRGroupActions', groupAction);

        const notification = {
            groupName: body.groupName,
            target: 'userLeft',
            arguments: [{
                userId: body.userId,
                timestamp: new Date().toISOString()
            }]
        };

        context.extraOutputs.set('signalRMessages', notification);

        return {
            status: 200,
            jsonBody: { 
                success: true,
                message: `User ${body.userId} left group ${body.groupName}`
            }
        };
    } catch (error) {
        context.error('Error leaving group:', error);
        return {
            status: 500,
            jsonBody: { error: 'Failed to leave group' }
        };
    }
}

app.http('leaveGroup', {
    methods: ['POST'],
    authLevel: 'anonymous',
    extraOutputs: [
        {
            type: 'signalR',
            name: 'signalRGroupActions',
            hubName: 'chat',
            connectionStringSetting: 'AzureSignalRConnectionString'
        },
        {
            type: 'signalR',
            name: 'signalRMessages',
            hubName: 'chat',
            connectionStringSetting: 'AzureSignalRConnectionString'
        }
    ],
    handler: async (request: HttpRequest, context: InvocationContext) => {
        const body = await request.json() as { groupName: string; userId: string };
        
        if (!body.groupName || !body.userId) {
            return {
                status: 400,
                jsonBody: { error: 'Missing required fields: groupName, userId' }
            };
        }

        context.log(`Removing user ${body.userId} from group ${body.groupName}`);

        const groupAction = {
            userId: body.userId,
            groupName: body.groupName,
            action: 'remove'
        };

        context.extraOutputs.set('signalRGroupActions', groupAction);

        const notification = {
            groupName: body.groupName,
            target: 'userLeft',
            arguments: [{
                userId: body.userId,
                timestamp: new Date().toISOString()
            }]
        };

        context.extraOutputs.set('signalRMessages', notification);

        return {
            status: 200,
            jsonBody: { 
                success: true,
                message: `User ${body.userId} left group ${body.groupName}`
            }
        };
    }
});

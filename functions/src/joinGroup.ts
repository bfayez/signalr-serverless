import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

/**
 * Add user to a group
 * Endpoint: POST /api/groups/join
 * Body: { groupName: string, userId: string }
 */
export async function joinGroup(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('JoinGroup function triggered');

    try {
        const body = await request.json() as { groupName: string; userId: string; connectionId?: string };
        
        if (!body.groupName || !body.userId) {
            return {
                status: 400,
                jsonBody: { error: 'Missing required fields: groupName, userId' }
            };
        }

        context.log(`Adding user ${body.userId} to group ${body.groupName}`);

        // SignalR group action
        const groupAction = {
            userId: body.userId,
            groupName: body.groupName,
            action: 'add'
        };

        context.extraOutputs.set('signalRGroupActions', groupAction);

        // Notify the group about new member
        const notification = {
            groupName: body.groupName,
            target: 'userJoined',
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
                message: `User ${body.userId} joined group ${body.groupName}`
            }
        };
    } catch (error) {
        context.error('Error joining group:', error);
        return {
            status: 500,
            jsonBody: { error: 'Failed to join group' }
        };
    }
}

app.http('joinGroup', {
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

        context.log(`Adding user ${body.userId} to group ${body.groupName}`);

        const groupAction = {
            userId: body.userId,
            groupName: body.groupName,
            action: 'add'
        };

        context.extraOutputs.set('signalRGroupActions', groupAction);

        const notification = {
            groupName: body.groupName,
            target: 'userJoined',
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
                message: `User ${body.userId} joined group ${body.groupName}`
            }
        };
    }
});

export default async function (fastify)  {

    fastify.delete('/:webhookId', async (request) => {
        const teamId = process.env.CLICKUP_TEAM_ID;
  
        const { webhookId } = request.params;
  
        const wh = await getWebhookById({ teamId, webhookId });
  
        if (!wh) return { response: 'No such webhook!' }
  
        await deleteWebhook(webhookId);
  
        return { webhookId };
	});
  
	fastify.get('/', async () => {
        const teamId = process.env.CLICKUP_TEAM_ID;
       
        const { webhooks } = await getWebhooksByTeam(teamId);
        console.log("🚀 ~ file: clickUp.js:56 ~ fastify.get ~ webhooks:", JSON.stringify(webhooks));
  
        return { size: webhooks.length, webhooks };
	});
  
	fastify.post('/', async () => {
  
		const teamId = process.env.CLICKUP_TEAM_ID;
		const ordersList = process.env.CLICKUP_ORDERS_ID;
		const webhookEndpoint =  process.env.WEBHOOK_ENDPOINT+'/clickup/processWebhook'

		const { webhooks } = await getWebhooksByTeam(teamId);
		
		if (!webhooks.length) {
			return await createWebhook({
				team_id: teamId, 
				list_id: ordersList, 
				endpoint: webhookEndpoint
			});
		} else {
			const myWebhook = webhooks.find(hook => hook.endpoint === webhookEndpoint);

			if (!myWebhook) {
				
				for await (let webhook of webhooks) {
					await deleteWebhook(webhook.id);
				}

				return await createWebhook({
					team_id: teamId, 
					list_id: ordersList, 
					endpoint: webhookEndpoint
				});

			}

			for await (let webhook of webhooks) {
				myWebhook.id !== webhook.id && await deleteWebhook(webhook.id);
			}
		}
  
		return { response: "Webhook already exists!" };
	});

}


async function deleteWebhook(webhookId) {
    const resp = await fetch(
      `https://api.clickup.com/api/v2/webhook/${webhookId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: process.env.CLICKUP_API_TOKEN,
        }
      }
    );

    return await resp.json();
}

async function getWebhookById({ teamId,webhookId }) {
    const { webhooks } = await getWebhooksByTeam(teamId);

    const [searchWebhook] = webhooks.filter(hook => hook.id === webhookId);

    return searchWebhook || null;

} 

async function getWebhooksByTeam(teamId) {
    const resp = await fetch(
        `https://api.clickup.com/api/v2/team/${teamId}/webhook`,
        {
            method: 'GET',
            headers: {
                Authorization: process.env.CLICKUP_API_TOKEN,
            }
        }   
    );

    return await resp.json();
}

async function createWebhook({team_id, list_id, endpoint}) {
    const createdWebhook = await fetch(
      `https://api.clickup.com/api/v2/team/${team_id}/webhook`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: process.env.CLICKUP_API_TOKEN,
        },
        body: JSON.stringify({
          endpoint,
          events: [
            'taskCreated',
            'taskUpdated',
          ],
          list_id,
        })
      }
    );
  
    return await createdWebhook.json();
}

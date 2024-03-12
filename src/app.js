import fastify from 'fastify';

import webhooksPlugin from './routes/webhooksPlugin.js';
import clickupPlugin from './routes/clickupPlugin.js';
import healthCheck from './routes/healthCheck.js'

const app = fastify({ 
	logger: true, 
    trustProxy: true 
});

app.register(webhooksPlugin, { prefix: 'webhooks' });
app.register(clickupPlugin, { prefix: 'clickup' });
app.register(healthCheck, { prefix: 'health' });

const port = process.env.PORT || 8080;
const host = process.env.ADDRESS || '0.0.0.0';

try {
	app.listen({ port, host });  
	app.log.info(`Server is now listening on ${ port }`);
} catch(err) {
	app.log.error(err);
}


app.addHook('onListen', async function () {
	const teamId = process.env.CLICKUP_TEAM_ID;
	const ordersList = process.env.CLICKUP_ORDERS_ID;
	const webhookEndpoint =  process.env.WEBHOOK_ENDPOINT + '/clickup/processWebhook';
	console.log("🚀 ~ file: app.js:31 ~ webhookEndpoint:", JSON.stringify(webhookEndpoint));

	const { webhooks } = await getWebhooksByTeam(teamId);

	console.log("🚀 ~ file: app.js:34 ~ webhooks:", JSON.stringify(webhooks));

	if (!webhooks || !webhooks.length) {
		return await createWebhook({
			team_id: teamId, 
			list_id: ordersList, 
			endpoint: webhookEndpoint,
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


async function deleteWebhook(webhookId) {
  try {
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
  } catch (error) {
    app.log.error(error)
  }

}

async function getWebhooksByTeam(teamId) {
	try {
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
	} catch (error) {
		app.log.error(error);
	}
}

async function createWebhook({ team_id, list_id, endpoint }) {
  console.log("🚀 ~ file: app.js:96 ~ createWebhook ~ { team_id, list_id, endpoint }:", JSON.stringify({ team_id, list_id, endpoint }));
  
  try {
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

  } catch (error) {
    app.log.error("error")
  }
}
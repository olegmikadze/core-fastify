import fetch from 'node-fetch';
import {google} from 'googleapis';
// import path from 'path';
// import { fileURLToPath } from 'url';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

const CUSTOM_TASK_ID = 'Custom Task ID';
const ORDER_NUMBER = 'ORDER #';
const CUSTOMER_PO = 'Customer PO';
const CUSTOMER = 'CUSTOMER';
const SHIPPING_ADDRESS = 'Shipping Address';
const ARTWORK_CODE = 'ARTWORK Code';
const PRODUCT = 'PRODUCT';
const FINISH = 'FINISH';
const CAN_SIZE = 'CAN SIZE';
const QUANTITY_CANS = 'QUANTITY Cans';
const PALLET_SIZE = 'Pallet Size';
const PRODUCTION_DATE = 'Production Date';

const COMPLETE_STATUS = 'complete';

const COLUMN_MAPPING = [
	{
		columnName: 'A',
		columnTitle: CUSTOM_TASK_ID,
		value: null,
	},
	{
		columnName: 'B',
		columnTitle: CUSTOMER_PO,
		value: null,
	},
	{
		columnName: 'C',
		columnTitle: CUSTOMER,
		value: null,
	},
	{
		columnName: 'D',
		columnTitle: SHIPPING_ADDRESS,
		value: null,
	},
	{
		columnName: 'E',
		columnTitle: ORDER_NUMBER,
		value: null,
	},
	{
		columnName: 'F',
		columnTitle: '',
		value: null,
	},
	{
		columnName: 'G',
		columnTitle: ARTWORK_CODE,
		value: null,
	},
	{
		columnName: 'H',
		columnTitle: PRODUCT,
		value: null,
	},
	{
		columnName: 'I',
		columnTitle: FINISH,
		value: null,
	},
	{
		columnName: 'J',
		columnTitle: CAN_SIZE,
		value: null,
	},
	{
		columnName: 'K',
		columnTitle: '',
		value: null,
	},
	{
		columnName: 'L',
		columnTitle: QUANTITY_CANS,
		value: null,
	},
	{
		columnName: 'M',
		columnTitle: PALLET_SIZE,
		value: null,
	},
	{
		columnName: 'N',
		columnTitle: PRODUCTION_DATE,
		value: null,
	},
]


export default async function (fastify) {

    fastify.post('/processWebhook', async (request) => {
        const { task_id, history_items, event } = request.body;
        console.log("🚀 ~ file: clickUp.js:37 ~ fastify.post ~ request.body:", JSON.stringify(request.body));

		const task = await getTaskbyId(task_id);
		console.log("🚀 ~ file: clickupPlugin.js:96 ~ fastify.post ~ newTask:", JSON.stringify(task));

		const customTaskId = task.custom_id || task.id;

        if (event === 'taskUpdated') {
			const typeField = history_items[0].field;
			console.log("🚀 ~ file: clickupPlugin.js:50 ~ fastify.post ~ typeField:", JSON.stringify(typeField));

			const afterValue = history_items[0].after;
			console.log("🚀 ~ file: clickupPlugin.js:51 ~ fastify.post ~ afterValue:", JSON.stringify(afterValue));
			
			const updatedCells = [];

			if (typeField === 'status') {
				const status = history_items[0].after.status;
				const date = new Date(+history_items[0].date)

				if (status.toLowerCase() === COMPLETE_STATUS) {
					updatedCells.push({
						fieldName: PRODUCTION_DATE,
						value: date ? date.toString() : ''
					});
				}
			}
          
			if (typeField === 'linked_task') {
            
				const linkedTask = await getTaskbyId(afterValue);
				
				const customerName = linkedTask.name.trim();
				const shippingAddress = linkedTask.custom_fields.filter(field => field.name === SHIPPING_ADDRESS)[0].value.formatted_address.trim();
				
				updatedCells.push({
					fieldName: CUSTOMER,
					value: customerName,
				}, {
					fieldName: SHIPPING_ADDRESS,
					value: shippingAddress,
				});

			}
          
			if (typeField === 'custom_field') {
				const customField = history_items[0].custom_field;
				console.log("🚀 ~ file: clickupPlugin.js:78 ~ fastify.post ~ customField:", JSON.stringify(customField));
				
				if (customField.type === 'drop_down') {
					console.log("🚀 ~ file: clickupPlugin.js:93 ~ fastify.post ~  customField.type_config.options:",  JSON.stringify(customField.type_config.options));
						
					updatedCells.push({
						fieldName: customField.name,
						value: afterValue ? customField.type_config.options.find(option => option.id === afterValue).name : '',
					});
				} else {
					updatedCells.push({
						fieldName: customField.name,
						value: afterValue || '',
					});
				}
			}

			await updateRow({ updatedCells, customTaskId });

        } else if (event === 'taskCreated') {

			try {
				const copiedTemplate = COLUMN_MAPPING.map(obj => ({...obj}));
				console.log("🚀 ~ file: clickupPlugin.js:167 ~ fastify.post ~ copiedTemplate:", JSON.stringify(copiedTemplate));
	
				const customFields = task.custom_fields;
				console.log("🚀 ~ file: clickupPlugin.js:171 ~ fastify.post ~ customFields:", JSON.stringify(customFields));
				
				copiedTemplate.find(obj => obj.columnTitle === CUSTOM_TASK_ID).value = customTaskId;
				console.log("🚀 ~ file: clickupPlugin.js:174 ~ fastify.post ~ copiedTemplate.find(obj => obj.columnTitle === CUSTOM_TASK_ID).value:", JSON.stringify(copiedTemplate.find(obj => obj.columnTitle === CUSTOM_TASK_ID).value));
				
				copiedTemplate.find(obj => obj.columnTitle === PRODUCT).value = task.name;
				console.log("🚀 ~ file: clickupPlugin.js:177 ~ fastify.post ~ copiedTemplate.find(obj => obj.columnTitle === PRODUCT).value :", JSON.stringify(copiedTemplate.find(obj => obj.columnTitle === PRODUCT).value));
	
				console.log("🚀 ~ file: clickupPlugin.js:180 ~ fastify.post ~ customFields.find(field => field.name.toLowerCase() === ORDER_NUMBER.toLowerCase()):", JSON.stringify(customFields.find(field => field.name.toLowerCase() === ORDER_NUMBER.toLowerCase())));
				const orderNumber = customFields.find(field => field.name.toLowerCase() === ORDER_NUMBER.toLowerCase()).value || '';
				copiedTemplate.find(obj => obj.columnTitle === ORDER_NUMBER).value = orderNumber;
	
				console.log("🚀 ~ file: clickupPlugin.js:184 ~ fastify.post ~ customFields.find(field => field.name.toLowerCase() === CUSTOMER_PO.toLowerCase()):", JSON.stringify(customFields.find(field => field.name.toLowerCase() === CUSTOMER_PO.toLowerCase())));
				const customerPO = customFields.find(field => field.name.toLowerCase() === CUSTOMER_PO.toLowerCase()).value || '';
				copiedTemplate.find(obj => obj.columnTitle === CUSTOMER_PO).value = customerPO;
	
				console.log("🚀 ~ file: clickupPlugin.js:188 ~ fastify.post ~ customFields.find(field => field.name.toLowerCase() === QUANTITY_CANS.toLowerCase()):", JSON.stringify(customFields.find(field => field.name.toLowerCase() === QUANTITY_CANS.toLowerCase())));
				const quantityCans = customFields.find(field => field.name.toLowerCase() === QUANTITY_CANS.toLowerCase()).value || '';
				copiedTemplate.find(obj => obj.columnTitle === QUANTITY_CANS).value = quantityCans;
	
				console.log("🚀 ~ file: clickupPlugin.js:192 ~ fastify.post ~ customFields.find(field => field.name.toLowerCase() === ARTWORK_CODE.toLowerCase()):", JSON.stringify(customFields.find(field => field.name.toLowerCase() === ARTWORK_CODE.toLowerCase())));
				const artworkCode = customFields.find(field => field.name.toLowerCase() === ARTWORK_CODE.toLowerCase()).value || '';
				copiedTemplate.find(obj => obj.columnTitle === ARTWORK_CODE).value = artworkCode;
	
				console.log("🚀 ~ file: clickupPlugin.js:196 ~ fastify.post ~ customFields.find(field => field.name.toLowerCase() === CAN_SIZE.toLowerCase()):", JSON.stringify(customFields.find(field => field.name.toLowerCase() === CAN_SIZE.toLowerCase())));
				const canSizeObj = customFields.find(field => field.name.toLowerCase() === CAN_SIZE.toLowerCase());
				const canSize = canSizeObj && Object.prototype.hasOwnProperty.call(canSizeObj, 'value') ? canSizeObj.type_config.options[canSizeObj.value].name : '';
				copiedTemplate.find(obj => obj.columnTitle === CAN_SIZE).value = canSize;
	
				console.log("🚀 ~ file: clickupPlugin.js:201 ~ fastify.post ~ customFields.find(field => field.name.toLowerCase() === FINISH.toLowerCase()):", JSON.stringify(customFields.find(field => field.name.toLowerCase() === FINISH.toLowerCase())));
				const finishObj = customFields.find(field => field.name.toLowerCase() === FINISH.toLowerCase());
				const finish = finishObj && Object.prototype.hasOwnProperty.call(finishObj, 'value') ? finishObj.type_config.options[finishObj.value].name : '';
				copiedTemplate.find(obj => obj.columnTitle === FINISH).value = finish;
	
				console.log("🚀 ~ file: clickupPlugin.js:206 ~ fastify.post ~ customFields.find(field => field.name.toLowerCase() === PALLET_SIZE.toLowerCase()):", JSON.stringify(customFields.find(field => field.name.toLowerCase() === PALLET_SIZE.toLowerCase())));
				const palletSizeObj = customFields.find(field => field.name.toLowerCase() === PALLET_SIZE.toLowerCase());
				const palletSize = palletSizeObj && Object.prototype.hasOwnProperty.call(palletSizeObj, 'value') ? palletSizeObj.type_config.options[palletSizeObj.value].name : '';
				copiedTemplate.find(obj => obj.columnTitle === PALLET_SIZE).value = palletSize;
	
				copiedTemplate.sort((a,b) => { a.columnName - b.columnName });
				
				const newRow = copiedTemplate.map(map => map.value);
				console.log("🚀 ~ file: clickupPlugin.js:203 ~ fastify.post ~ copiedTemplate:", JSON.stringify(copiedTemplate));
	
				await appendRow(newRow);
			} catch (error) {
				fastify.log.error(error);
			}
			
        } 
    });
}

async function getTaskbyId(taskId) {
    const task = await fetch(
      `https://api.clickup.com/api/v2/task/${taskId}`,
      {
        method: 'GET',
        headers: {
          Authorization: process.env.CLICKUP_API_TOKEN
        }
      }
    );

    return await task.json();
}


async function updateRow ({ updatedCells, customTaskId })  {
	console.log("🚀 ~ file: clickupPlugin.js:225 ~ updateRow ~ updatedCell:", JSON.stringify(updatedCells));
	console.log("🚀 ~ file: clickupPlugin.js:226 ~ updateRow ~ customTaskId:", JSON.stringify(customTaskId));

	const authClient = new google.auth.GoogleAuth({
		scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
	
    const sheets = await google.sheets({ version:"v4", auth: authClient });
	
    try {
		const response = await sheets.spreadsheets.values.get({
			spreadsheetId: process.env.SPREADSHEETID,
            range: `'CLICKUP DATA'!A1:P`,
        });
		
        const rows = response.data.values;
		
        let rowNumber;
        
        for (let i =  0; i < rows.length; i++) {
            if (rows[i][0] === customTaskId) { 
                rowNumber = i + 1;
                break;
            }
        }
      
        for await (const cell of updatedCells) {

			const columnName = COLUMN_MAPPING.find(map => map.columnTitle.toLowerCase() === cell.fieldName.toLowerCase()).columnName || null;
			
			console.log("🚀 ~ file: clickupPlugin.js:181 ~ forawait ~ columnName:", JSON.stringify(columnName));

            if (columnName && rowNumber) {


				const res = await sheets.spreadsheets.values.update({
					spreadsheetId: process.env.SPREADSHEETID,
					range: `'CLICKUP DATA'!${columnName}${rowNumber}`,
					valueInputOption: "RAW",
					resource: { "values": [ [cell.value] ] },
				});

				console.log("🚀 ~ file: clickupPlugin.js:313 ~ appendRow ~ res:", JSON.stringify(res));
            }
        }
		
    } catch (err) {
      if (err) return console.log('The API returned an error: ' + err);
    }
}

async function appendRow(row) {
    console.log("🚀 ~ file: clickUp.js:153 ~ appendRow ~ values:", JSON.stringify(row));
    
    const authClient = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });


    const sheets = await google.sheets({ version:"v4", auth: authClient });

    try {
		console.log("🚀 ~ file: clickupPlugin.js:310 ~ appendRow ~ try:")
		
		await sheets.spreadsheets.values.append({
            spreadsheetId: process.env.SPREADSHEETID,
            range: "'CLICKUP DATA'!A:A",
            valueInputOption: "RAW",
            resource: { "values": [ row ] },
        });

    } catch (err) {
        if (err) return console.log('The API returned an error: ' + err);
    }
}

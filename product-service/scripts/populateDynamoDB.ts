import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from 'node:crypto'

const client = new DynamoDBClient({ region: 'eu-central-1' });
const dynamoDB = DynamoDBDocumentClient.from(client);

async function createProduct(title: string, description: string, price: number): Promise<string> {
    const product_id = randomUUID();

    const params = {
        TableName: 'products',
        Item: {
            'id': product_id,
            'title': title,
            'description': description,
            'price': price
        }
    };

    await dynamoDB.send(new PutCommand(params));

    return product_id;
}

async function createStock(product_id: string, count: number): Promise<void> {
    const params = {
        TableName: 'stocks',
        Item: {
            'product_id': product_id,
            'count': count
        }
    };

    await dynamoDB.send(new PutCommand(params));
}

async function populateTables(): Promise<void> {
    const products = [
        {
            title: 'JBL Go 4',
            description: 'An ultra-portable Bluetooth speaker with big JBL Pro Sound, punchy bass, and bold styling.',
            price: 39.99
        },
        {
            title: 'JBL Authentics 200',
            description: 'Portable smart home speaker with Wi-Fi, Bluetooth and voice assistants with retro design.',
            price: 270.99
        },
        {
            title: 'JBL Flip 6',
            description: 'Portable Waterproof Speaker.',
            price: 129.99
        },
        {
            title: 'JBL Tour One M2',
            description: 'Wireless over-ear Noise Cancelling headphones.',
            price: 279.99
        },
        {
            title: 'JBL Tune 720BT',
            description: 'Wireless over-ear headphones.',
            price: 47.99
        },
        {
            title: 'JBL Quantum ONE',
            description: 'USB Wired Over-Ear Professional PC Gaming Headset with Head-Tracking Enhanced ',
            price: 229.99
        }

    ];

    for (const product of products) {
        const product_id = await createProduct(product.title, product.description, product.price);
        await createStock(product_id, Math.floor(Math.random() * 50 + 1));
    }
}

populateTables()
    .then(() => console.log('Tables populated successfully.'))
    .catch((error) => console.error('Error populating tables:', error));

import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  // 1. Authenticate the webhook to make sure it actually came from Shopify.
  // 'payload' contains all the JSON data about the product that was updated!
  const { shop, topic, payload } = await authenticate.webhook(request);

  // 2. Do something with the data (Log it, save to DB, send an email, etc.)
  console.log(`\n================================`);
  console.log(`WEBHOOK CAUGHT!`);
  console.log(`Event: ${topic}`);
  console.log(`Store: ${shop}`);
  console.log(`Product Updated: ${payload.title}`);
  console.log(`================================\n`);

  // 4. Data saved in DB
  await db.productUpdateLog.create({
    data: {
      shop: shop,
      productTitle: String(payload.title),
      updatedData: JSON.stringify(payload)
    }
  });

  // 3. You MUST return an empty Response to tell Shopify "Message Received".
  // If you don't, Shopify will think your server is down and keep retrying.
  return new Response(null, { status: 200 });
};

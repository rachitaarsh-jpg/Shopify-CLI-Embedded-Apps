import { useEffect } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData, Form } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import db from "../db.server"; // Our database connection

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // session gives us information about the logged-in user's shop
  const { admin, session } = await authenticate.admin(request);

  // 1. We ask Shopify for the store's name using GraphQL
  const response = await admin.graphql(
    `#graphql
    query {
      shop {
        name
        myshopifyDomain
      }
    }`
  );
  const responseJson = await response.json();

  // 2. We ask our database if a note exists for this shop
  const storeNote = await db.storeNote.findUnique({
    where: { shop: session.shop },
  });

  // 3. We return the shop data AND the note to our React component
  return {
    shopName: responseJson.data.shop.name,
    shopDomain: responseJson.data.shop.myshopifyDomain,
    note: storeNote?.note || "", // if there is no note, default to empty string
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  // 1. We grab the form data that the user submitted
  const formData = await request.formData();
  const newNote = formData.get("note") as string;

  // 2. We save it to the database (upsert means "update if it exists, insert if it doesn't")
  await db.storeNote.upsert({
    where: { shop: session.shop },
    update: { note: newNote },
    create: { shop: session.shop, note: newNote },
  });

  // 3. Return a success message
  return { success: true };
};

export default function Index() {
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  // Grab the data that our loader returned
  const { shopName, shopDomain, note } = useLoaderData<typeof loader>();

  // Check if the form is currently saving
  const isSaving = fetcher.state === "submitting";

  // Show a little toast message when the save is complete
  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show("Note saved successfully!");
    }
  }, [fetcher.data, shopify]);

  return (
    <s-page heading={`Welcome to your app, ${shopName}! 🎉`}>
      <s-section>
        <s-paragraph>
          Your store domain is <strong>{shopDomain}</strong>. We just fetched this data from Shopify!
        </s-paragraph>
      </s-section>

      <s-section heading="My Custom App Note">
        <s-paragraph>
          Type a note below. When you click save, we will send it to the backend `action` function and save it in your Prisma database.
        </s-paragraph>

        {/* We use fetcher.Form so it saves without reloading the entire page */}
        <fetcher.Form method="POST" style={{ marginTop: "1rem" }}>
          <s-box paddingBlockEnd="400">
            <input
              type="text"
              name="note"
              defaultValue={note}
              placeholder="Type your secret note here..."
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #ccc",
                fontSize: "16px"
              }}
            />
          </s-box>
          <s-button submit {...(isSaving ? { loading: true } : {})}>
            {isSaving ? "Saving..." : "Save Note to Database"}
          </s-button>
        </fetcher.Form>
      </s-section>

      <s-section slot="aside" heading="App template specs">
        <s-paragraph>
          <s-text>Framework: </s-text>
          <s-link href="https://reactrouter.com/" target="_blank">
            React Router
          </s-link>
        </s-paragraph>
        <s-paragraph>
          <s-text>Interface: </s-text>
          <s-link
            href="https://shopify.dev/docs/api/app-home/using-polaris-components"
            target="_blank"
          >
            Polaris web components
          </s-link>
        </s-paragraph>
        <s-paragraph>
          <s-text>API: </s-text>
          <s-link
            href="https://shopify.dev/docs/api/admin-graphql"
            target="_blank"
          >
            GraphQL
          </s-link>
        </s-paragraph>
        <s-paragraph>
          <s-text>Custom data: </s-text>
          <s-link
            href="https://shopify.dev/docs/apps/build/custom-data"
            target="_blank"
          >
            Metafields &amp; metaobjects
          </s-link>
        </s-paragraph>
        <s-paragraph>
          <s-text>Database: </s-text>
          <s-link href="https://www.prisma.io/" target="_blank">
            Prisma
          </s-link>
        </s-paragraph>
      </s-section>

      <s-section slot="aside" heading="Next steps">
        <s-unordered-list>
          <s-list-item>
            Build an{" "}
            <s-link
              href="https://shopify.dev/docs/apps/getting-started/build-app-example"
              target="_blank"
            >
              example app
            </s-link>
          </s-list-item>
          <s-list-item>
            Explore Shopify&apos;s API with{" "}
            <s-link
              href="https://shopify.dev/docs/apps/tools/graphiql-admin-api"
              target="_blank"
            >
              GraphiQL
            </s-link>
          </s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};

import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useLoaderData, useFetcher } from "react-router";
import { authenticate } from "../shopify.server";

// =====================================================================
// 1. THE LOADER (BACKEND: READ DATA)
// =====================================================================
// The loader function runs on your server BEFORE the page loads in the browser.
// Use this to fetch data from Shopify or your database.
export const loader = async ({ request }: LoaderFunctionArgs) => {
    // Authenticate the user and get the 'admin' object to talk to Shopify
    const { admin } = await authenticate.admin(request);

    // This is a GraphQL Query. It asks Shopify for specific data.
    // Here we are asking for the first 5 products, and for each one, its ID, title, and tags.
    const response = await admin.graphql(
        `#graphql
            query {
                products(first: 5) {
                    edges {
                        node {
                            id
                            title
                            tags
                        }
                    }
                }
            }
        `
    );

    // Convert Shopify's response into JSON (a Javascript object)
    const responseJson = await response.json();

    // Log the data to the terminal so we can see the exact shape of the data
    console.log("SHOPIFY DATA: ", JSON.stringify(responseJson, null, 2));

    // Whatever we 'return' here becomes available to our React component below
    return {
        products: responseJson.data.products.edges,
    };
}

// =====================================================================
// 2. THE ACTION (BACKEND: WRITE/MODIFY DATA)
// =====================================================================
// The action function runs ONLY when a form is submitted on this page.
// Use this to modify data (like creating, updating, or deleting things).
export const action = async ({ request }: ActionFunctionArgs) => {
    const { admin } = await authenticate.admin(request);

    // 1. Grab the form data that was submitted from the frontend
    const formData = await request.formData();
    // 'productId' matches the name="productId" attribute of the hidden input in our form
    const productId = formData.get("productId") as String;

    // 2. Tell Shopify to add a tag using a GraphQL Mutation
    // A Mutation is just a Query that changes data instead of just reading it.
    const response = await admin.graphql(
        `#graphql
            mutation addProductTag($id : ID!, $tags:[String!]!) {
                tagsAdd(id: $id, tags: $tags) {
                    userErrors {
                        message
                    }
                }
            }
        `,
        {
            // These variables are injected into the GraphQL mutation above
            variables: {
                id: productId,
                tags: ["Awesome"] // The tag we want to add!
            },
        }
    );
    
    // Actions usually return a success message or redirect the user
    return { success: true };
}

// =====================================================================
// 3. THE FRONTEND (REACT COMPONENT)
// =====================================================================
// This is the actual UI that draws the page on the screen.
export default function ProductsPage() {
    // 1. Grab the 'products' array that our loader just sent us
    const { products } = useLoaderData<typeof loader>();

    // 2. We use a fetcher to submit forms in the background. 
    // This allows us to submit data without refreshing the entire webpage!
    const fetcher = useFetcher();

    return (
        <s-page heading="Recent Products">
            <s-section heading="Store Inventory">
                <s-paragraph>Here are the latest products from your store:</s-paragraph>

                {/* <ul> creates a bulleted list */}
                <ul>
                    {/* .map() loops through our products array one by one.
                        'edge' represents the current product we are looking at in the loop. */}
                    {products.map((edge: any) => (
                        // Every item in a React list needs a unique 'key'
                        <li key={edge.node.id} style={{ paddingBottom: "20px" }}>
                            
                            {/* Product Title */}
                            <strong>{edge.node.title}</strong>

                            {/* Display the tags we fetched. 
                                .join(",") turns an array like ["A", "B"] into a string "A,B" */}
                            <p>
                                Tags: {edge.node.tags.join(",") || "No tags yet"}
                            </p>

                            {/* The form to submit the Mutation. 
                                We use fetcher.Form so it happens in the background. */}
                            <fetcher.Form method="post">
                                {/* This hidden input secretly passes the product ID to our action */}
                                <input type="hidden" name="productId" value={edge.node.id} />
                                
                                {/* Clicking this submit button triggers the action function at the top of the file */}
                                <s-button type="submit" style={{ padding: "5px 10px", cursor: "pointer" }}>
                                    Add 'Awesome' Tag
                                </s-button>
                            </fetcher.Form>

                        </li>
                    ))}
                </ul>
            </s-section>
        </s-page>
    )
};
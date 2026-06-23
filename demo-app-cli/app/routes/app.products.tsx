import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";

// --- 1. THE BACKEND (Loader) ---
// This runs on your server before the page loads
export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { admin } = await authenticate.admin(request);

    // Ask Shopify for the first 5 products.

    const response = await admin.graphql(
        `#graphql
            query{
            products(first:5){
                 edges{
                    node{
                            id
                            title
                }
            }
            }
            }
        `
    );

    const responseJson = await response.json();

    // We return the array of products to the frontend
    return {
        products: responseJson.data.products.edges,
    };
}


// --- 2. THE FRONTEND (React Component) ---
// This is what draws the page on the screen
export default function ProductsPage() {
    // Grab the products array that our loader just sent us
    const { products } = useLoaderData<typeof loader>();

    return (
        <s-page heading="Recent Products">
            <s-section heading="Store Inventory">
                <s-paragraph>Here are the latest products from your store:</s-paragraph>

                {/* We use the Javascript .map() function to loop through the products
                and draw a bullet point for each one */}

                <ul>
                    {products.map((edge: any) => (
                        <li key={edge.node.id}>
                            <strong>{edge.node.title}</strong>
                        </li>
                    ))}
                </ul>
            </s-section>
        </s-page>


    )
};
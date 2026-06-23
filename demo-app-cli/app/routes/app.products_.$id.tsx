import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link } from "react-router";
import { authenticate } from "../shopify.server";

// 1. THE LOADER
export const loader = async ({ request, params }: LoaderFunctionArgs) => {
    const { admin } = await authenticate.admin(request);

    // params.id comes directly from the URL!
    // But Shopify expects a full "Global ID" (GID) like: gid://shopify/Product/12345
    // So we need to reconstruct it:
    const fullShopifyId = `gid://shopify/Product/${params.id}`;

    const response = await admin.graphql(
        `#graphql
        # 1. 'query' tells Shopify we want to READ data (not change it).
        # 2. 'getProduct' is the name of our query (like a function name).
        # 3. '($id: ID!)' says this query requires a variable named '$id'. 
        #    The '!' means it is strictly required.
        query getProduct($id: ID!) {

            # 4. 'product(id: $id)' is the actual Shopify database field we are asking for.
            #    We are saying: "Find the product where the ID matches the variable we passed in."
            product(id: $id) {
                
                # 5. Inside the product, these are the exact pieces of data we want returned.
                title
                descriptionHtml
                vendor 
                status
            }
        }`,
        {
            // 6. This is where we take the Javascript variable 'fullShopifyId' 
            //    and inject it into the GraphQL variable '$id'
            variables: {
                id: fullShopifyId
            }
        }
    );

    const responseJson = await response.json();

    console.log("SHOPIFY PRODUCT DATA: ",
        JSON.stringify(responseJson, null, 2));

    return {
        product: responseJson.data.product,
        id: params.id
    }
}

// 2. THE COMPONENT
export default function ProductDetailsPage() {
    //Grab the single product from our loader
    const { product, id } = useLoaderData<typeof loader>();

    return (
        <s-page heading="Product Details">
            <s-section>
                {/* A link to go back to the list */}
                <Link to="/app/products" style={{ textDecoration: "none", color: "blue" }}>
                    ← Back to Products
                </Link>
                <hr style={{ margin: "20px 0" }} />
                <h1>{product.title}</h1>
                <p><strong>Status:</strong> {product.status}</p>
                <p><strong>Vendor:</strong> {product.vendor}</p>
                <p><strong>Shopify ID:</strong> {id}</p>

                {/* Display the HTML description */}
                <div
                    style={{ marginTop: "20px", padding: "15px", border: "1px solid #ccc" }}
                    dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
                />
            </s-section>
        </s-page>
    );
}
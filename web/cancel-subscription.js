import { GraphqlQueryError } from "@shopify/shopify-api";
import shopify from "./shopify.js";



export default async function cancelSubscription(
    session,
    isProdOverride = process.env.isProd === "production"
  ){

    const subscriptionId = await getActiveSubsId(session);
    if (!subscriptionId) {
      console.log("No active subscription found to cancel:", session.shop);
      return "NO_SUBSCRIPTION_FOUND";
    }
    console.log("subscriptionId:" + subscriptionId)
    const status = await appSubscriptionCancel(session, subscriptionId);

    return status;
  
  }


  async function getActiveSubsId(session) {
    const client = new shopify.api.clients.Graphql({ session });
  
      const currentInstallations = await client.request(RECURRING_PURCHASES_QUERY);
      const subscriptions =
        currentInstallations.data.currentAppInstallation.activeSubscriptions;
  
      for (let i = 0, len = subscriptions.length; i < len; i++) {
        console.log("subscription name: ", subscriptions[i].name);
        console.log("Subscription Id: ",subscriptions[i].id);
        return subscriptions[i].id;

      }

  }

  async function appSubscriptionCancel(session, subscriptionId) {
    if (!subscriptionId) {
      throw new Error("Missing subscription ID for cancellation");
    }

    const client = new shopify.api.clients.Graphql({ session });
  
    const mutationResponse = await client.request(CANCEL_SUBSCRIPTION, { variables: { id: subscriptionId } });

    const userErrors = mutationResponse.data?.appSubscriptionCancel?.userErrors || [];
    if (userErrors.length) {
      throw new Error(`Subscription cancel userErrors: ${JSON.stringify(userErrors)}`);
    }
    console.log("Subscription canceled successfully: ", session.shop);

    return mutationResponse.data?.appSubscriptionCancel?.appSubscription?.status || "UNKNOWN";

  }

  const CANCEL_SUBSCRIPTION = `
mutation appSubscriptionCancel($id: ID!) {
  appSubscriptionCancel(id: $id) {
    appSubscription {
      id
      name
      status
    }
    userErrors {
      field
      message
    }
  }
}
`;

const RECURRING_PURCHASES_QUERY = `
query appSubscription {
  currentAppInstallation {
    activeSubscriptions {
      name, id, test
    }
  }
}
`;

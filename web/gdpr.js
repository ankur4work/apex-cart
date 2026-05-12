import { DeliveryMethod } from "@shopify/shopify-api";

function parseWebhookBody(body) {
  try {
    return JSON.parse(body);
  } catch (error) {
    console.error("Failed to parse webhook payload", error);
    return null;
  }
}

/**
 * @type {{[key: string]: import("@shopify/shopify-api").WebhookHandler}}
 */
export default {
  /**
   * Customers can request their data from a store owner. When this happens,
   * Shopify invokes this webhook.
   *
   * https://shopify.dev/docs/apps/webhooks/configuration/mandatory-webhooks#customers-data_request
   */
  CUSTOMERS_DATA_REQUEST: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/api/webhooks",
    callback: async (topic, shop, body, webhookId) => {
      const payload = parseWebhookBody(body);
      if (!payload) {
        console.log("❌ Failed to parse CUSTOMERS_DATA_REQUEST webhook");
        return;
      }
      console.log(`✅ CUSTOMERS_DATA_REQUEST webhook received for shop: ${shop}`);
      console.log(`   Customer: ${payload.customer?.email}`);
      console.log(`   Data Request ID: ${payload.data_request?.id}`);
      // Your custom logic here
      return;
    },
  },

  /**
   * Store owners can request that data is deleted on behalf of a customer. When
   * this happens, Shopify invokes this webhook.
   *
   * https://shopify.dev/docs/apps/webhooks/configuration/mandatory-webhooks#customers-redact
   */
  CUSTOMERS_REDACT: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/api/webhooks",
    callback: async (topic, shop, body, webhookId) => {
      const payload = parseWebhookBody(body);
      if (!payload) {
        console.log("❌ Failed to parse CUSTOMERS_REDACT webhook");
        return;
      }
      console.log(`✅ CUSTOMERS_REDACT webhook received for shop: ${shop}`);
      console.log(`   Customer: ${payload.customer?.email}`);
      console.log(`   Orders to redact: ${payload.orders_to_redact?.length || 0}`);
      // Your custom logic here - typically delete customer data
      return;
    },
  },

  /**
   * 48 hours after a store owner uninstalls your app, Shopify invokes this
   * webhook.
   *
   * https://shopify.dev/docs/apps/webhooks/configuration/mandatory-webhooks#shop-redact
   */
  SHOP_REDACT: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/api/webhooks",
    callback: async (topic, shop, body, webhookId) => {
      const payload = parseWebhookBody(body);
      if (!payload) {
        console.log("❌ Failed to parse SHOP_REDACT webhook");
        return;
      }
      console.log(`✅ SHOP_REDACT webhook received for shop: ${shop}`);
      console.log(`   Shop ID: ${payload.shop_id}`);
      // Your custom logic here - typically delete all shop data
      return;
    },
  },
};

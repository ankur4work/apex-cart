import { ApiVersion, BillingInterval } from "@shopify/shopify-api";
import { shopifyApp } from "@shopify/shopify-app-express";
import { MongoDBSessionStorage } from "@shopify/shopify-app-session-storage-mongodb";
import { restResources } from "@shopify/shopify-api/rest/admin/2026-01";
import dotenv from "dotenv";

dotenv.config();

const billingPlanName = process.env.BILLING_PLAN_NAME || "Premium Plan";
const billingAmount = Number(process.env.BILLING_AMOUNT || "99.99");
const billingCurrencyCode = process.env.BILLING_CURRENCY_CODE || "USD";
const billingTrialDays = parseInt(process.env.BILLING_TRIAL_DAYS || "0", 10);

const billingConfig = {
  [billingPlanName]: {
    lineItems: [
      {
        amount: billingAmount,
        currencyCode: billingCurrencyCode,
        interval: BillingInterval.Every30Days,
        trialDays: billingTrialDays,
      },
    ],
  },
};

const shopify = shopifyApp({
  api: {
    apiVersion: ApiVersion.April26,
    restResources,
    apiKey: process.env.SHOPIFY_API_KEY,
    apiSecretKey: process.env.SHOPIFY_API_SECRET,
    hostName: process.env.HOST.replace(/https?:\/\//, ""),
    scopes: process.env.SCOPES.split(","),
    billing: billingConfig,
    future: {
      expiringOfflineAccessTokens: true,
      unstable_managedPricingSupport: true,
    },
  },
  auth: {
    path: "/api/auth",
    callbackPath: "/api/auth/callback",
  },
  webhooks: {
    path: "/api/webhooks",
  },
  sessionStorage: new MongoDBSessionStorage(
    process.env.MONGODB_URI,
    process.env.MONGODB_DB_NAME
  ),
});

export default shopify;

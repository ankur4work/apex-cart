// @ts-check
import { join } from "path";
import { readFileSync } from "fs";
import express from "express";
import serveStatic from "serve-static";

import shopify from "./shopify.js";
import { RequestedTokenType } from "@shopify/shopify-api";
import productCreator from "./product-creator.js";
import cancelSubscription from "./cancel-subscription.js";
import GDPRWebhookHandlers from "./gdpr.js";
import crypto from "crypto";
import dotenv from "dotenv";

import createDbConnection from './analytics-db.js'; // Database initialization
import { connectToMongoDB } from "./mongodb.js"; // Import the MongoDB utility

dotenv.config();

const PORT = parseInt(
    process.env.BACKEND_PORT || process.env.PORT || "3000",
    10
);

const STATIC_PATH =
    process.env.NODE_ENV === "production"
        ? `${process.cwd()}/frontend/dist`
        : `${process.cwd()}/frontend/`;

const app = express();

/* --------------------------- Constants --------------------------- */
const PREMIUM_PLAN = process.env.BILLING_PLAN_NAME || "Premium Plan";
const APP_NAMESPACE = "anchor_cart";
const SUBSCRIPTION_METAFIELD_KEY = "subscription";
const IS_TEST = process.env.BILLING_IS_TEST !== "false";
const APP_NAME = "Apex Cart";
const ANALYTICS_DB_PREFIX = "anchor_atc";
const MANAGED_PRICING_APP_HANDLE = "sticky-add-to-cart-67";
//  process.env.SHOPIFY_MANAGED_PRICING_HANDLE || "sticky-add-to-cart-67";
const ENABLE_DIRECT_BILLING_UPGRADE = process.env.ENABLE_DIRECT_BILLING_UPGRADE === "true";
const SHOP_DETAILS_ENDPOINT = process.env.SHOP_DETAILS_ENDPOINT || "";
const ALLOWED_ANALYTICS_EVENTS = new Set(["atc_clicked"]);
const HTTP_STATUS = { OK: 200, BAD_REQUEST: 400, UNAUTHORIZED: 401, INTERNAL_SERVER_ERROR: 500 };
const ENABLE_WEBHOOK_AUTO_REGISTER = process.env.ENABLE_WEBHOOK_AUTO_REGISTER === "true";
/**
 * @template T
 * @param {Promise<T>} promise
 * @param {number} timeoutMs
 * @param {string} label
 * @returns {Promise<T>}
 */
function withTimeout(promise, timeoutMs, label) {
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`${label} timed out after ${timeoutMs}ms`));
            }, timeoutMs);
        }),
    ]);
}

/* ---------------- Shopify Auth & Webhooks ---------------- */
app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
    shopify.config.auth.callbackPath,
    async (req, res, next) => {
        try {
            const callbackResponse = await shopify.api.auth.callback({
                rawRequest: req,
                rawResponse: res,
            });

            console.log("OAuth callback session details:", {
                shop: callbackResponse.session.shop,
                isOnline: callbackResponse.session.isOnline,
                hasAccessToken: Boolean(callbackResponse.session.accessToken),
                grantedScope: callbackResponse.session.scope,
                expectedScopes: shopify.api.config.scopes,
            });

            let sessionToStore = callbackResponse.session;

            // Migrate shpat_ (non-expiring) tokens immediately after OAuth
            if (sessionToStore.accessToken && sessionToStore.accessToken.startsWith("shpat_")) {
                try {
                    console.log("OAuth gave shpat_ token, migrating to expiring token for", sessionToStore.shop);
                    const migrated = await shopify.api.auth.migrateToExpiringToken({
                        shop: sessionToStore.shop,
                        nonExpiringOfflineAccessToken: sessionToStore.accessToken,
                    });
                    if (migrated && migrated.session) {
                        sessionToStore = migrated.session;
                        console.log("Token migrated, new prefix:", sessionToStore.accessToken.substring(0, 12));
                    }
                } catch (migrateErr) {
                    console.error("Token migration failed:", migrateErr.message || migrateErr);
                }
            }

            await shopify.config.sessionStorage.storeSession(sessionToStore);

            // Webhook auto-registration is intentionally disabled for now.
            // The app relies on webhook subscriptions configured in shopify.app*.toml.
            // Uncomment this block if runtime webhook registration is needed later.
            // if (ENABLE_WEBHOOK_AUTO_REGISTER && !callbackResponse.session.isOnline) {
            //   try {
            //     await shopify.api.webhooks.register({ session: callbackResponse.session });
            //   } catch (error) {
            //     console.error("Webhook registration failed during OAuth callback:", error);
            //   }
            // } else if (!callbackResponse.session.isOnline) {
            //   console.log("Skipping webhook auto-registration during OAuth callback");
            // }

            res.locals.shopify = {
                ...res.locals.shopify,
                session: callbackResponse.session,
            };

            next();
        } catch (error) {
            console.error("OAuth callback failed:", error);
            const message = error instanceof Error ? error.message : "OAuth callback failed";
            res.status(500).send(message);
        }
    },
    shopify.redirectToShopifyOrAppRoot()
);
app.post(
    "/api/webhooks",
    express.text({ type: "*/*" }),
    async (req, res) => {
        const hmacHeader = req.headers["x-shopify-hmac-sha256"];
        if (!hmacHeader) return res.status(400).send();

        const generatedHash = crypto
            .createHmac("sha256", process.env.SHOPIFY_API_SECRET)
            .update(req.body, "utf8")
            .digest("base64");

        let valid = false;
        try {
            valid = crypto.timingSafeEqual(
                Buffer.from(generatedHash, "base64"),
                Buffer.from(hmacHeader, "base64")
            );
        } catch {
            return res.status(400).send();
        }

        if (!valid) return res.status(401).send();

        res.status(200).send();

        const topic = String(req.headers["x-shopify-topic"] ?? "")
            .toUpperCase().replace(/\//g, "_");
        const shop = req.headers["x-shopify-shop-domain"];
        const webhookId = req.headers["x-shopify-webhook-id"];
        const handler = GDPRWebhookHandlers[topic];
        if (handler?.callback) {
            handler.callback(topic, shop, req.body, webhookId)
                .catch(err => console.error(`[Webhook] ${topic} handler error:`, err));
        }
    }
);

app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Handles URL-encoded data

/* ============================================================
   PUBLIC ENDPOINT: Check subscription by shop (for embed / frontend)
   Uses session from MongoDB + updates metafield on shop
   ============================================================ */
app.get("/api/mobile-menu/hasSubscription", async (req, res) => {
    try {
        const { shop } = req.query;

        if (!shop) {
            console.warn("❌ Missing 'shop' parameter in request");
            return res.status(400).send({ error: "Missing 'shop' parameter" });
        }

        console.log(`🔍 Public subscription check for shop: ${shop}`);

        // Fetch session from MongoDB (offline session)
        const collection = await connectToMongoDB();
        const session = await collection.findOne({ shop });

        if (!session) {
            console.warn(`❌ No session found for shop in MongoDB: ${shop}`);
            return res.status(401).send({ error: "Unauthorized: Session not found" });
        }

        const tier = await getPlanTier(session);
        console.log(`📊 Subscription status for ${shop}: ${tier}`);

        // Sync metafield on shop
        await updateSubscriptionMetafield(session, tier);

        return res.status(200).send({
            hasActiveSubscription: tier !== "free",
            tier,
        });
    } catch (error) {
        console.error("❌ Error in /api/mobile-menu/hasSubscription:", error);
        return res.status(500).send({ error: "Failed to fetch subscription" });
    }
});

/* ============================================================
   Subscription & Metafield Utilities
   ============================================================ */

/**
 * Get current plan tier for a session.
 * Returns "premium" or "free".
 */
async function getPlanTier(session) {
    try {
        const _billingRaw = await shopify.api.billing.check({
            session,
            plans: [PREMIUM_PLAN],
            isTest: IS_TEST,
        });
        const hasPremium = typeof _billingRaw === "object" ? _billingRaw.hasActivePayment : _billingRaw;

        return hasPremium ? "premium" : "free";
    } catch (error) {
        console.error("❌ Error checking plan tier:", error);
        return "free";
    }
}

/**
 * Get Shop GID (ownerId for shop metafields)
 */
async function getShopGid(session) {
    const client = new shopify.api.clients.Graphql({ session });

    console.log(`🔧 Fetching shop GID for: ${session.shop}`);

    const response = await client.query({
        data: `#graphql
      {
        shop {
          id
        }
      }
    `,
    });

    const shopId = response.body?.data?.shop?.id;

    if (!shopId) {
        console.error("❌ Could not get shop.id from GraphQL response:", response.body);
        throw new Error("Shop ID not found");
    }

    console.log(`✅ Found shop GID: ${shopId}`);
    return shopId;
}

/**
 * Update unstructured subscription metafield on SHOP.
 *
 * - Owner: Shop (so available in Liquid: shop.metafields.anchor_cart.subscription)
 * - Namespace: "anchor_cart"
 * - Key: "subscription"
 * - Type: single_line_text_field
 * - Value: "premium" or "free"
 */
async function updateSubscriptionMetafield(session, planTier) {
    try {
        const client = new shopify.api.clients.Graphql({ session });
        const ownerId = await getShopGid(session);

        // Decide the actual value to store
        const metafieldValue = planTier === "premium" ? "premium" : "free";

        console.log(
            `🔄 Setting shop metafield ${APP_NAMESPACE}.${SUBSCRIPTION_METAFIELD_KEY} for ${session.shop} to: ${metafieldValue}`
        );

        const METAFIELDS_SET_MUTATION = `#graphql
      mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            id
            namespace
            key
            value
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

        const result = await client.query({
            data: {
                query: METAFIELDS_SET_MUTATION,
                variables: {
                    metafields: [
                        {
                            ownerId,
                            namespace: APP_NAMESPACE,
                            key: SUBSCRIPTION_METAFIELD_KEY,
                            type: "single_line_text_field",
                            value: metafieldValue,
                        },
                    ],
                },
            },
        });

        const metafieldsSet = result.body?.data?.metafieldsSet;
        const userErrors = metafieldsSet?.userErrors || [];

        if (userErrors.length > 0) {
            console.error("❌ metafieldsSet userErrors:", userErrors);
            return false;
        }

        console.log(`✅ Successfully SET shop metafield for ${session.shop}`);
        return true;
    } catch (error) {
        console.error("❌ Error in updateSubscriptionMetafield:", error);
        return false;
    }
}

async function getOfflineSessionByShop(shop) {
    let session;

    if (typeof shopify.config.sessionStorage.findSessionsByShop === "function") {
        const sessions = await shopify.config.sessionStorage.findSessionsByShop(shop);
        session = sessions.find((candidate) => !candidate.isOnline) || sessions[0];
    }

    if (!session) {
        session = await shopify.config.sessionStorage.loadSession(`offline_${shop}`);
    }

    return session;
}

function getManagedPricingUrl(shopDomain) {
    const storeHandle = shopDomain.split(".")[0];
    return `https://admin.shopify.com/store/${storeHandle}/charges/${MANAGED_PRICING_APP_HANDLE}/pricing_plans`;
}

function hasSubscriptionBillingScope(session) {
    const grantedScope = String(session?.scope || "");
    return (
        grantedScope.includes("read_own_subscription_contracts") ||
        grantedScope.includes("write_own_subscription_contracts")
    );
}

/* ============================================================
   Analytics & Proxy Endpoints
   ============================================================ */
app.get("/api/anchor-cart/hasSubscription", async (req, res) => {
    try {
        const { shop } = req.query;

        // Validate `shop` parameter
        if (!shop) {
            console.warn("Missing 'shop' parameter in request");
            return res.status(400).send({ error: "Missing 'shop' parameter" });
        }

        console.log(`Request received from shop: ${shop}`);

        // Fetch session from MongoDB
        const collection = await connectToMongoDB();
        const session = await collection.findOne({ shop });

        if (!session) {
            console.warn(`No session found for shop: ${shop}`);
            return res.status(401).send({ error: "Unauthorized: Session not found" });
        }

        // Check subscription status
        const hasPaymentRaw = await shopify.api.billing.check({
            session,
            plans: [PREMIUM_PLAN],
            isTest: IS_TEST,
        });
        const hasPayment = typeof hasPaymentRaw === 'object' ? hasPaymentRaw.hasActivePayment : hasPaymentRaw;

        console.log(`Subscription status for shop ${shop}: ${hasPayment ? "Active" : "Inactive"}`);

        // Sync metafield with current status
        await updateSubscriptionMetafield(session, hasPayment ? "premium" : "free");

        return res.status(200).send({
            hasActiveSubscription: !!hasPayment,
            tier: hasPayment ? "premium" : "free"
        });
    } catch (error) {
        console.error("Error in hasSubscription:", error.message);
        return res.status(500).send({ error: "Failed to fetch subscription" });
    }
});

// Function to log events to the generic analytics table
app.post("/api/anchor-cart/:event", async (req, res) => {
    try {
        const eventName = typeof req.params.event === "string" ? req.params.event.toLowerCase() : "";
        const rawShop = typeof req.query.shop === "string" ? req.query.shop : "";
        const shop = shopify.api.utils.sanitizeShop(rawShop);
        const eventData = req.body; // Other event-specific data (like productId)

        // Validate required parameters
        if (!shop) {
            console.warn("Missing 'shop' parameter in request");
            return res.status(400).send({ error: "Missing 'shop' parameter" });
        }

        if (!ALLOWED_ANALYTICS_EVENTS.has(eventName)) {
            return res.status(400).send({ error: "Unsupported event type" });
        }

        console.log(`Event received: ${eventName} for merchant: ${shop} with data:`, eventData);

        // Create a dynamic DB connection based on the app name (ANALYTICS_DB_PREFIX is fixed)
        const db = createDbConnection(ANALYTICS_DB_PREFIX);

        // Prepare the event data as a JSON string
        const eventDataString = JSON.stringify(eventData);

        // Log the event to the dynamic table for the specific app
        db.run(
            `INSERT INTO ${ANALYTICS_DB_PREFIX}_events (event_type, merchant_id, event_data) VALUES (?, ?, ?)`,
            [eventName, shop, eventDataString],
            function (err) {
                if (err) {
                    console.error("Error logging event:", err.message);
                    return res.status(500).send({ error: "Failed to log event" });
                }
                console.log("Event logged successfully:", this.lastID);
                res.status(200).send({ success: true, eventId: this.lastID });
            }
        );
    } catch (error) {
        console.error("Error handling event:", error.message);
        res.status(500).send({ error: "Failed to handle event" });
    }
});

app.get("/api/store-atc-count", async (req, res) => {
    try {
        const rawShop = typeof req.query.shop === "string" ? req.query.shop : "";
        const shop = shopify.api.utils.sanitizeShop(rawShop);
        const startDate = typeof req.query.startDate === "string" ? req.query.startDate : "";
        const endDate = typeof req.query.endDate === "string" ? req.query.endDate : "";

        if (!shop) {
            return res.status(400).send({ error: "Missing 'shop' parameter" });
        }

        // Create a dynamic DB connection
        const db = createDbConnection(ANALYTICS_DB_PREFIX);

        // Base query
        let query = `
      SELECT COUNT(*) as atcClick_count 
      FROM ${ANALYTICS_DB_PREFIX}_events 
      WHERE merchant_id = ? AND event_type = 'atc_clicked'
    `;
        const params = [shop];

        // Add date range filters if both startDate and endDate are provided
        if (startDate && endDate) {
            query += " AND created_at BETWEEN ? AND ?";
            params.push(startDate, endDate);
        }

        db.get(query, params, (err, row) => {
            if (err) {
                console.error("Error fetching product count:", err.message);
                return res.status(500).send({ error: "Failed to fetch product count" });
            }

            res.status(200).send({ shop, productCount: row?.atcClick_count || 0 });
        });
    } catch (error) {
        console.error("Error handling product count request:", error.message);
        res.status(500).send({ error: "Failed to handle request" });
    }
});

app.get("/api/public/hasActiveSubscription", async (req, res) => {
    try {
        const rawShop = typeof req.query.shop === "string" ? req.query.shop : "";
        const shop = shopify.api.utils.sanitizeShop(rawShop);

        if (!shop) {
            return res.status(400).send({ error: "Missing or invalid 'shop' parameter" });
        }

        const session = await getOfflineSessionByShop(shop);

        if (!session) {
            return res.status(200).send({
                hasActiveSubscription: false,
                tier: "free",
                reason: "offline-session-not-found",
            });
        }

        const tier = await getPlanTier(session);
        return res.status(200).send({
            hasActiveSubscription: tier !== "free",
            tier,
        });
    } catch (error) {
        console.error("Failed to fetch public subscription status:", error);
        return res.status(500).send({ error: "Failed to fetch subscription status" });
    }
});

app.get("/api/public/createSubscription", async (req, res) => {
    try {
        if (!PREMIUM_PLAN) {
            return res.status(500).send({ error: "Billing plan is not configured on server" });
        }

        const rawShop = typeof req.query.shop === "string" ? req.query.shop : "";
        const shop = shopify.api.utils.sanitizeShop(rawShop);

        if (!shop) {
            return res.status(400).send({ error: "Missing or invalid 'shop' parameter" });
        }

        const session = await getOfflineSessionByShop(shop);
        if (!session) {
            return res.status(401).send({ error: "Unauthorized: Session not found" });
        }

        if (!session.accessToken) {
            return res.status(401).send({ error: "Unauthorized: Missing access token in session" });
        }

        const confirmationUrl = getManagedPricingUrl(session.shop);

        return res.status(200).send({
            isActiveSubscription: false,
            plan: PREMIUM_PLAN,
            confirmationUrl,
            billingFlow: "managed_pricing",
        });
    } catch (error) {
        console.error("Failed to create public subscription:", error);
        return res.status(500).send({ error: "Failed to create subscription" });
    }
});
app.get("/api/public/createSubscription/redirect", async (req, res) => {
  try {
    const rawShop = typeof req.query.shop === "string" ? req.query.shop : "";
    const shop = shopify.api.utils.sanitizeShop(rawShop);

    if (!shop) {
      return res.status(400).json({ error: "Missing or invalid shop parameter" });
    }

    const session = await getOfflineSessionByShop(shop);
    if (!session || !session.accessToken) {
      return res.status(401).json({ error: "Unauthorized: Session not found" });
    }

    try {
      const billingResult = await withTimeout(
        shopify.api.billing.request({
          session,
          plan: PREMIUM_PLAN,
          isTest: IS_TEST,
        }),
        12000,
        "billing.request"
      );

      const confirmationUrl =
        typeof billingResult === "string" ? billingResult : billingResult?.confirmationUrl;

      if (confirmationUrl) {
        return res.status(200).json({ confirmationUrl });
      }
    } catch (billingRequestError) {
      console.warn(
        "billing.request failed; falling back to managed pricing",
        billingRequestError
      );
    }

    const pricingUrl = getManagedPricingUrl(session.shop);
    return res.status(200).json({ confirmationUrl: pricingUrl });
  } catch (error) {
    console.error("Failed to create redirect subscription:", error);
    let message = error instanceof Error ? error.message : "Failed to open Shopify billing";
    if (
      error &&
      typeof error === "object" &&
      "response" in error &&
      error.response &&
      typeof error.response === "object" &&
      "body" in error.response
    ) {
      const body = error.response.body;
      const graphQlErrors = body?.errors;
      if (graphQlErrors) {
        message = JSON.stringify(graphQlErrors);
      }
    }
    return res.status(500).json({ error: message });
  }
});
// app.get("/api/public/createSubscription/redirect", async (req, res) => {
//     try {
//         const rawShop = typeof req.query.shop === "string" ? req.query.shop : "";
//         const shop = shopify.api.utils.sanitizeShop(rawShop);

//         if (!shop) {
//             return res.status(400).json({ error: "Missing or invalid 'shop' parameter" });
//         }

//         const session = await getOfflineSessionByShop(shop);
//         if (!session || !session.accessToken) {
//             return res.status(401).json({ error: "Unauthorized: Session not found" });
//         }

//         try {
//             console.log(`➡️ Generating billing URL for: ${session.shop}`);

//             const billingResult = await withTimeout(
//                 shopify.api.billing.request({
//                     session,
//                     plan: PREMIUM_PLAN,
//                     isTest: IS_TEST,
//                 }),
//                 12000,
//                 "billing.request"
//             );

//             const confirmationUrl = typeof billingResult === "string" ? billingResult : billingResult?.confirmationUrl;

//             if (confirmationUrl) {
//                 console.log(`✅ Generated billing URL for: ${session.shop}`);
//                 return res.status(200).json({ confirmationUrl });
//             } else {
//                 throw new Error("No confirmation URL returned from billing.request");
//             }
//         } catch (billingRequestError) {
//             console.error(`❌ billing.request failed for ${session.shop}:`, billingRequestError);

//             // If the GraphQL client returned 401 Unauthorized, prompt re-authentication
//             const statusCode = billingRequestError?.response?.code || billingRequestError?.status || 500;
//             if (statusCode === 401) {
//                 const reauthUrl = `/api/auth?shop=${encodeURIComponent(session.shop)}`;
//                 return res.status(401).json({ error: "unauthorized", message: "Session invalid or missing billing permissions", reauthUrl });
//             }

//             return res.status(500).json({ error: "Failed to generate billing checkout URL" });
//         }
//     } catch (error) {
//         console.error("Failed to create billing subscription:", error);
//         const message = error instanceof Error ? error.message : "Failed to generate billing URL";
//         return res.status(500).json({ error: message });
//     }
// });

app.get("/api/billing/callback", async (req, res) => {
    try {
        const rawShop = typeof req.query.shop === "string" ? req.query.shop : "";
        const shop = shopify.api.utils.sanitizeShop(rawShop);
        if (!shop) return res.redirect(process.env.HOST);
        const session = await getOfflineSessionByShop(shop);
        if (!session) return res.redirect(process.env.HOST + "/api/auth?shop=" + encodeURIComponent(shop));
        try {
            const hasPremiumRaw = await shopify.api.billing.check({
                session,
                plans: [PREMIUM_PLAN],
                isTest: IS_TEST,
            });
        const hasPremium = typeof hasPremiumRaw === 'object' ? hasPremiumRaw.hasActivePayment : hasPremiumRaw;
            if (hasPremium) {
                console.log("Billing approved for " + shop);
                await updateSubscriptionMetafield(session, "premium");
            }
        } catch (e) {
            console.error("Billing callback check failed:", e);
        }
        const shopPrefix = shop.replace(".myshopify.com", "");
        const host = Buffer.from("admin.shopify.com/store/" + shopPrefix).toString("base64url");
        return res.redirect(process.env.HOST + "/pricing?shop=" + encodeURIComponent(shop) + "&host=" + host);
    } catch (err) {
        console.error("Billing callback error:", err);
        return res.redirect(process.env.HOST);
    }
});


/* ---- Migrate shpat_ (non-expiring) tokens to expiring tokens automatically ---- */
app.use("/api/*splat", async (req, res, next) => {
    try {
        const shop = req.query.shop || (req.headers["x-shopify-shop-domain"]);
        if (shop) {
            const session = await getOfflineSessionByShop(String(shop));
            if (session && session.accessToken && session.accessToken.startsWith("shpat_")) {
                try {
                    console.log("Migrating shpat_ token for", session.shop);
                    const result = await shopify.api.auth.migrateToExpiringToken({
                        shop: session.shop,
                        nonExpiringOfflineAccessToken: session.accessToken,
                    });
                    if (result && result.session) {
                        await shopify.config.sessionStorage.storeSession(result.session);
                        console.log("Token migrated for", session.shop, "new prefix:", result.session.accessToken.substring(0, 12));
                    }
                } catch (migrateErr) {
                    console.error("Token migration failed:", migrateErr.message || migrateErr);
                }
            }
        }
    } catch (e) {
        // never block the request
    }
    next();
});



/* ---- Cancel subscription via Token Exchange (bypasses validateAuthenticatedSession) ---- */
app.get("/api/billing/cancel", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const bearerMatch = authHeader && authHeader.match(/Bearer (.*)/);
        if (!bearerMatch) return res.status(401).json({ error: "Missing authorization" });

        const sessionToken = bearerMatch[1];
        const payload = await shopify.api.session.decodeSessionToken(sessionToken);
        const shop = payload.dest.replace("https://", "");

        let session;
        try {
            const result = await shopify.api.auth.tokenExchange({
                sessionToken,
                shop,
                requestedTokenType: RequestedTokenType.OnlineAccessToken,
            });
            session = result.session;
        } catch (txErr) {
            console.error("Token exchange failed for cancel:", txErr.message);
            session = await getOfflineSessionByShop(shop);
            if (!session) return res.status(401).json({ error: "No session found" });
        }

        try {
            const subscriptionStatus = await cancelSubscription(session);
            console.log("Subscription cancelled for", shop, "status:", subscriptionStatus);
        } catch (cancelErr) {
            console.error("Cancel error:", cancelErr.message);
        }

        await updateSubscriptionMetafield(session, "free");
        return res.status(200).json({ status: "cancelled" });
    } catch (err) {
        console.error("Billing cancel error:", err.message || err);
        return res.status(500).json({ error: err.message || "Cancel failed" });
    }
});

/* ---- Billing: Token Exchange endpoint (bypasses validateAuthenticatedSession) ---- */
app.get("/api/billing/start", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const bearerMatch = authHeader && authHeader.match(/Bearer (.*)/);
        if (!bearerMatch) return res.status(401).json({ error: "Missing authorization" });

        const sessionToken = bearerMatch[1];
        const payload = await shopify.api.session.decodeSessionToken(sessionToken);
        const shop = payload.dest.replace("https://", "");

        let session;
        try {
            const result = await shopify.api.auth.tokenExchange({
                sessionToken,
                shop,
                requestedTokenType: RequestedTokenType.OnlineAccessToken,
            });
            session = result.session;
            await shopify.config.sessionStorage.storeSession(session);
            console.log("Token exchange success for", shop, "prefix:", session.accessToken.substring(0, 12));
        } catch (txErr) {
            console.error("Token exchange failed, falling back to stored session:", txErr.message);
            session = await getOfflineSessionByShop(shop);
            if (!session) return res.status(401).json({ error: "No session found" });
        }

        const returnUrl = process.env.HOST + "/api/billing/callback?shop=" + encodeURIComponent(shop);
        const billingResult = await shopify.api.billing.request({
            session,
            plan: PREMIUM_PLAN,
            isTest: IS_TEST,
            returnUrl,
        });

        const confirmationUrl = typeof billingResult === "string" ? billingResult : billingResult?.confirmationUrl;
        console.log("Billing URL for", shop, ":", confirmationUrl);
        return res.status(200).json({ confirmationUrl, isActiveSubscription: false });
    } catch (err) {
        console.error("Billing start error:", err.message || err);
        return res.status(500).json({ error: err.message || "Billing failed" });
    }
});

/* ---- Plan info: public endpoint for frontend pricing display ---- */
app.get("/api/plan-info", (_req, res) => {
  res.json({
    name: process.env.BILLING_PLAN_NAME || "Premium Plan",
    amount: process.env.BILLING_AMOUNT || "99.99",
    trialDays: parseInt(process.env.BILLING_TRIAL_DAYS || "0", 10),
    currency: "USD",
  });
});

/* ---- Analytics: public endpoint (no session required, shop param used as merchant_id) ---- */
const analyticsDb = createDbConnection(ANALYTICS_DB_PREFIX);

app.get("/api/store-atc-count", (req, res) => {
  const { shop, startDate, endDate } = req.query;
  if (!shop) return res.status(400).json({ error: "shop param required" });

  let sql = `SELECT COUNT(*) as count FROM ${ANALYTICS_DB_PREFIX}_events WHERE merchant_id = ? AND event_type = 'atc_clicked'`;
  const params = [shop];

  if (startDate) { sql += ` AND date(created_at) >= ?`; params.push(startDate); }
  if (endDate)   { sql += ` AND date(created_at) <= ?`; params.push(endDate); }

  analyticsDb.get(sql, params, (err, row) => {
    if (err) {
      console.error("Error fetching atc count:", err.message);
      return res.status(500).json({ error: "DB error" });
    }
    res.json({ productCount: row?.count ?? 0 });
  });
});

/* ----------------------- Protected Routes ----------------------- */
app.use("/api/*splat", shopify.validateAuthenticatedSession());

// Utility Function for Error Response
const handleError = (res, statusCode, message) => {
    console.error(message);
    res.status(statusCode).send({ error: message });
};

/* ============================================================
   Subscription Routes (Authenticated)
   ============================================================ */

/**
 * Create subscription (redirect URL) and ensure metafield is set when active.
 */
app.get("/api/createSubscription", async (req, res) => {
    try {
        if (!PREMIUM_PLAN) {
            return res.status(500).send({ error: "Billing plan is not configured on server" });
        }

        const session = res.locals.shopify.session;

        console.log(`➡️ ${session.shop} opening billing for upgrade to: ${PREMIUM_PLAN}`);

        try {
            const returnUrl = process.env.HOST + "/api/billing/callback?shop=" + encodeURIComponent(session.shop);
            const billingResult = await shopify.api.billing.request({
                session,
                plan: PREMIUM_PLAN,
                isTest: IS_TEST,
                returnUrl,
            });

            const confirmationUrl = typeof billingResult === "string" ? billingResult : billingResult?.confirmationUrl;

            res.status(200).send({
                isActiveSubscription: false,
                plan: PREMIUM_PLAN,
                confirmationUrl: confirmationUrl,
            });
        } catch (billingErr) {
            console.error("❌ Billing request failed:", billingErr);
            res.status(500).send({ error: "Failed to generate billing checkout URL." });
        }
    } catch (error) {
        console.error("❌ Failed to create subscription:", error);
        res.status(500).send({
            error: "Failed to create subscription",
        });
    }
});

/**
 * Cancel subscription and update metafield to "free".
 */
app.get("/api/cancelSubscription", async (req, res) => {
    try {
        const session = res.locals.shopify.session;

        const hasPaymentRaw = await shopify.api.billing.check({
            session,
            plans: [PREMIUM_PLAN],
            isTest: IS_TEST,
        });
        const hasPayment = typeof hasPaymentRaw === 'object' ? hasPaymentRaw.hasActivePayment : hasPaymentRaw;

        if (hasPayment) {
            console.log(`⚠️ ${session.shop} cancelling plan: ${PREMIUM_PLAN}`);

            const subscriptionStatus = await cancelSubscription(session);

            console.log(
                `✅ ${session.shop} subscription cancelled. Status from API: ${subscriptionStatus}`
            );

            // Set metafield to "free"
            await updateSubscriptionMetafield(session, "free");

            return res.status(200).send({
                status: subscriptionStatus,
                cancelledPlan: PREMIUM_PLAN,
            });
        }

        console.log(`ℹ️ ${session.shop} has no active subscription to cancel`);

        // Still ensure metafield is set to free
        await updateSubscriptionMetafield(session, "free");

        res.status(200).send({
            status: "No subscription found",
        });
    } catch (error) {
        console.error("❌ Failed to cancel subscription:", error);
        res.status(500).send({
            error: "Failed to cancel subscription",
        });
    }
});

/**
 * Check subscription (authenticated) and sync metafield at the same time.
 */
app.get("/api/hasActiveSubscription", async (req, res) => {
    try {
        const session = res.locals.shopify.session;
        const tier = await getPlanTier(session);
        const hasActive = tier !== "free";

        console.log(`🔎 ${session.shop} subscription check → Current tier: ${tier}`);

        // Keep metafield in sync with billing
        await updateSubscriptionMetafield(session, tier);

        res.status(200).send({
            hasActiveSubscription: hasActive,
            tier,
        });
    } catch (error) {
        console.error("❌ Failed to fetch subscription:", error);
        res.status(500).send({ error: "Failed to fetch subscription" });
    }
});

/* --------------------- Utility / Debug Routes --------------------- */
app.get("/api/getshop", async (req, res) => {
    const session = res.locals.shopify.session;
    try {
        const response = { shop: session?.shop };
        res.status(200).send(response);
    } catch (e) {
        console.log(`❌ Failed to get Shop: ${e.message}`);
        res.status(500).send({ error: e.message });
    }
});

/* ------------------------ Store Details Route ------------------------ */
const shopDetailsQuery = `
{
  shop {
    name
    email
    primaryDomain {
      url
      host
    }
    plan {
      displayName
    }
  }
}`;

// Route: Fetch Store Details
app.get('/api/store-details', async (req, res) => {
    console.log('Fetching store details via GraphQL...');
    const session = res.locals.shopify.session;

    if (!session) return handleError(res, HTTP_STATUS.UNAUTHORIZED, 'No active session found.');

    try {
        const client = new shopify.api.clients.Graphql({ session });
        const response = await client.query({ data: shopDetailsQuery });

        const { name, email, primaryDomain, plan } = response.body.data.shop;

        // Store shop details in external service
        storeShopDetails({
            appName: APP_NAME,
            storeUrl: primaryDomain.url,
            name,
            email,
            plan: plan.displayName,
        });

        console.log('Shop details fetched successfully.');
        res.status(HTTP_STATUS.OK).send({
            message: 'Shop details fetched successfully',
            data: { name, email, primaryDomain, plan },
        });
    } catch (error) {
        handleError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, `Failed to fetch store details: ${error.message}`);
    }
});

// Utility Function: Store Shop Details
async function storeShopDetails(shopDetails) {
    if (!SHOP_DETAILS_ENDPOINT) {
        return;
    }

    try {
        const response = await fetch(SHOP_DETAILS_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(shopDetails),
        });

        if (!response.ok) throw new Error('Network response was not ok.');
        console.log('Shop details stored successfully.');
    } catch (error) {
        console.error('Failed to store shop details:', error.message);
    }
}





app.use(shopify.cspHeaders());
app.use(serveStatic(STATIC_PATH, { index: false }));

app.use("/{*splat}", shopify.ensureInstalledOnShop(), async (_req, res, _next) => {
    return res
        .status(200)
        .set("Content-Type", "text/html")
        .send(readFileSync(join(STATIC_PATH, "index.html")));
});

app.listen(PORT, () => {
    console.log(`✅ Anchor Cart Backend server running on port ${PORT}`);
});

const CURRENT_APP_INSTALLATION = `
    query appSubscription($namespace: String!, $key: String!) {
      currentAppInstallation {
        id
        metafield(namespace: $namespace, key: $key) {
          namespace
          key
          value
          id
        }
      }
    }
`;

const CREATE_APP_DATA_METAFIELD = `
mutation CreateAppDataMetafield($metafieldsSetInput: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafieldsSetInput) {
    metafields {
      id
      namespace
      key
    }
    userErrors {
      field
      message
    }
  }
}
`;


const DELETE_APP_DATA_METAFIELD = `
mutation metafieldDelete($input: MetafieldDeleteInput!) {
    metafieldDelete(input: $input) {
      deletedId
      userErrors {
        field
        message
      }
    }
  }
`;

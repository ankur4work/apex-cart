const fs = require('fs');

const indexJsx = `import React from "react";
import {
  Card,
  Page,
  Layout,
  TextContainer,
  Button,
  Modal,
  Icon,
  DataTable,
  MediaCard,
  Frame,
  TopBar,
  CalloutCard,
  VideoThumbnail,
  DisplayText
} from "@shopify/polaris";

import { useState, useCallback, useMemo } from 'react';
import { useAuthenticatedFetch } from "../hooks";
import { ThemeValidate } from "../components/ThemeSelection";
import { ActiveSubscription } from "../components/ActiveSubscriptionCheck";
import { shopifyBackground } from "../assets";
import ReactPlayer from "react-player";
import {
  ExternalMinor,
  CircleTickMinor, HomeMajor,ChecklistMajor
} from '@shopify/polaris-icons';

import { useNavigate } from "react-router-dom";
import { Redirect } from "@shopify/app-bridge/actions";
import { useAppBridge } from "@shopify/app-bridge-react";
import { Toast } from "@shopify/app-bridge-react";
import { Iconkeyfeature } from "../components/Iconkeyfeature";
import { TotalWishlists } from "../components/TotalWishlists";
import ProductClickTracker from '../components/AnalyticsChart';

export default function HomePage() {
  const emptyToastProps = { content: null };
  const [isLoadingSubscribe, setIsLoadingSubscribe] = useState(false);
  const [isLoadingCancelSubscribe, setIsLoadingCancelSubscribe] = useState(false);

  const [active, setActive] = useState(false);
  const [activelookbook, setActiveLookbook] = useState(false);
  const [activefeed, setActiveFeed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleChange = useCallback(() => setActive(!active), [active]);

  const app = useAppBridge();
  const fetch = useAuthenticatedFetch();
  const redirect = Redirect.create(app);

  const [toastProps, setToastProps] = useState(emptyToastProps);
  
  // Setup button commented out as requested
  // const activator = <Button onClick={handleChange}>Open Setup Walkthrough</Button>;
  const activator = null;

  const shop = useMemo(
    () => new URLSearchParams(window.location.search).get("shop"),
    []
  );

  const template = 'index'; // Replace with your actual template value
  const uuid = 'eeb19ada-c040-4603-bc63-1f65e187937d'; // Replace with your actual UUID
  const handlePaid = 'Sticky-atc'; // Replace with your actual handle
  const handleFree = 'Sticky-atc';
  const reviewUrl = "https://apps.shopify.com/meroxio-comparison-slider#modal-show=WriteReviewModal"


  function openThemeEditor() {
    if (!shop) return;
    const url = \\\`https://\\${shop}/admin/themes/current/editor?context=apps&template=\\${template}&activateAppId=\\${uuid}/\\${handlePaid}\\\`;
    window.open(url);
  }

  function enableFreePlan() {
    if (!shop) return;
    const url = \\\`https://\\${shop}/admin/themes/current/editor?context=apps&template=\\${template}&activateAppId=\\${uuid}/\\${handleFree}\\\`;
    window.open(url);
  }

  function openReviewPage() {
    window.open(reviewUrl);
  }

  async function subscribePlan() {
    setIsLoadingSubscribe(true);
    const res = await fetch("/api/createSubscription"); //fetch instance of userLoggedInFetch(app)
    const data = await res.json();
    setIsLoadingSubscribe(false);
    if (data.error) {
      console.log(data.error);
      setToastProps({ content: "Redirecting to payment page..", error: true });
    } else if (data.confirmationUrl) {
      const { confirmationUrl } = data;
      setToastProps({ content: "Redirecting to payment page.." });
      redirect.dispatch(Redirect.Action.REMOTE, confirmationUrl);
    } else if (data.isActiveSubscription) {
      console.log("Already subscribed")
      setToastProps({ content: "You already have a active subscription" });
    }
  }


  async function cancelSubscription() {
    setIsLoadingCancelSubscribe(true);
    const res = await fetch("/api/cancelSubscription"); //fetch instance of userLoggedInFetch(app)
    const data = await res.json();
    setIsLoadingCancelSubscribe(false);
    console.log(data.status);
    if (data.status === "CANCELLED") {
      setToastProps({ content: "Successfully Cancelled the subscription" });
      window.location.reload();
    } else {
      setToastProps({ content: "Failed to cancel the subscription" });
    }
  }

  const toastMarkup = toastProps.content && (
    <Toast {...toastProps} onDismiss={() => setToastProps(emptyToastProps)} />
  );

  const navigate = useNavigate();

  const logo = {
    width: 450,
    height: 90,
    topBarSource:
      \\\`https://i.ibb.co/r2mjc3tD/image.png\\\`,
    url: '/',
    accessibilityLabel: 'Anchor Cart',
  };

  const goToPricingPage = () => {
    navigate("/pricing");
  };
  
  const secondaryMenuMarkup = (
    <TopBar.Menu
      activatorContent={<div></div>}
    />
  );

  const topBarMarkup = (
    <TopBar secondaryMenu={secondaryMenuMarkup} />
  );

  return (
    <Frame topBar={topBarMarkup} logo={logo} >
      <Page fullWidth>
        {toastMarkup}
        <ProductClickTracker/>
        <Layout>
          
          <Layout.Section>
            <div style={{ backgroundColor: '#002e4d', padding: '40px', borderRadius: '12px', color: 'white', textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <Icon source={CircleTickMinor} color="onBgFill" />
              </div>
              <DisplayText size="ExtraLarge"><span style={{ color: 'white' }}>Welcome to Anchor Cart</span></DisplayText>
              <div style={{ marginTop: '12px', fontSize: '18px', opacity: 0.9 }}>
                Increase your conversion rate instantly with an always-visible, sticky add-to-cart bar.
              </div>
              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center', gap: '15px' }}>
                <Button primary size="large" onClick={openThemeEditor}>Enable in Theme Editor</Button>
                {/* <Button size="large" onClick={handleChange}>Open Setup Walkthrough</Button> */}
              </div>
            </div>
          </Layout.Section>

          <Layout.Section secondary>
            <Card sectioned title="🚢 Anchor Cart Checklist">
              <div style={{ padding: '10px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ background: '#e1f5fe', padding: '8px', borderRadius: '50%', marginRight: '12px' }}>⛵</div>
                  <span style={{ fontSize: '15px', fontWeight: '500' }}>Enable the Anchor Cart app block in Theme Editor</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ background: '#e1f5fe', padding: '8px', borderRadius: '50%', marginRight: '12px' }}>📱</div>
                  <span style={{ fontSize: '15px', fontWeight: '500' }}>Review the appearance on both Desktop and Mobile</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ background: '#e1f5fe', padding: '8px', borderRadius: '50%', marginRight: '12px' }}>🎨</div>
                  <span style={{ fontSize: '15px', fontWeight: '500' }}>Adjust colors to match your storefront</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ background: '#e1f5fe', padding: '8px', borderRadius: '50%', marginRight: '12px' }}>💎</div>
                  <span style={{ fontSize: '15px', fontWeight: '500' }}>Upgrade in Pricing for premium controls</span>
                </div>
              </div>
              <div style={{ marginTop: '20px' }}>
                <Button fullWidth onClick={goToPricingPage}>View Pricing Plans</Button>
              </div>
            </Card>

            <div style={{ marginTop: '20px' }}>
              <Card sectioned title="See it in action">
                <div style={{ borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                  <video
                      src="https://cdn.shopify.com/videos/c/o/v/61131438cc4e4c19a8d674d4449d2c02.mp4"
                      controls
                      autoPlay
                      loop
                      muted
                      playsInline
                      style={{ width: '100%', height: '100%', display: 'block' }}
                    >
                      Your browser does not support the video tag.
                  </video>
                </div>
              </Card>
            </div>
          </Layout.Section>

          <Layout.Section>
            <Card sectioned title="Powerful Features">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '10px' }}>
                <div style={{ padding: '15px', border: '1px solid #e1e3e5', borderRadius: '8px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px', color: '#002e4d' }}>📌 Always-visible</div>
                  <p style={{ color: '#5c5f62' }}>Keep the purchase action reachable across long product pages, reducing scroll friction.</p>
                </div>
                <div style={{ padding: '15px', border: '1px solid #e1e3e5', borderRadius: '8px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px', color: '#002e4d' }}>⚡ Live Information</div>
                  <p style={{ color: '#5c5f62' }}>Show dynamic real-time image, title, price, compare-at price, and variant details.</p>
                </div>
                <div style={{ padding: '15px', border: '1px solid #e1e3e5', borderRadius: '8px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px', color: '#002e4d' }}>🎨 Complete Branding</div>
                  <p style={{ color: '#5c5f62' }}>Match button text, colors, and styling effortlessly with your storefront design.</p>
                </div>
                <div style={{ padding: '15px', border: '1px solid #e1e3e5', borderRadius: '8px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px', color: '#002e4d' }}>📱 Mobile Optimized</div>
                  <p style={{ color: '#5c5f62' }}>Perfect layout and spacing constraints designed specifically for smaller devices/touch.</p>
                </div>
              </div>
            </Card>

            {/* Commented out as requested
            <Modal
              activator={activator}
              open={active}
              onClose={handleChange}
              title="Quick Setup in 2.0 themes"
            >
              <Modal.Section>
                <div>
                  <div style={{ padding: '56% 0 0 0', position: 'relative' }}><iframe src="https://cdn.shopify.com/videos/c/o/v/edb1a0fe13844f63bc48d8d2822842aa.mp4" frameBorder="0" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen style={{ position: 'absolute', top: '0', left: '0', width: '100%', height: '100%' }} title="Quick Setup"></iframe></div>
                </div>
              </Modal.Section>
            </Modal> 
            */}

          </Layout.Section>

        </Layout>
      </Page>
    </Frame>
  );
}
`;

const pricingJsx = `import React, { useEffect, useMemo, useState } from "react";
import {
  Page,
  Layout,
  Card,
  Button,
  Frame,
  Icon,
  Banner,
  Stack,
  SkeletonPage,
  SkeletonBodyText,
  Modal,
  TextContainer,
  TopBar,
} from "@shopify/polaris";
import { CircleTickMinor, CancelSmallMinor, CheckMinor } from "@shopify/polaris-icons";
import { Redirect } from "@shopify/app-bridge/actions";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useAuthenticatedFetch } from "../hooks";

export default function Pricing() {
  const app = useAppBridge();
  const fetchAuth = useAuthenticatedFetch();
  const redirect = Redirect.create(app);

  const logo = {
    topBarSource:
      "https://i.ibb.co/r2mjc3tD/image.png",
    width: 490,
    url: "/",
    accessibilityLabel: "Anchor Cart",
  };

  const topBarMarkup = <TopBar showNavigationToggle />;

  const tick = useMemo(
    () => <Icon source={CheckMinor} color="success" />,
    []
  );
  const cross = useMemo(
    () => <Icon source={CancelSmallMinor} color="subdued" />,
    []
  );
  const [shop, setShop] = useState("");

  const [serverTier, setServerTier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState({
    open: false,
    target: null,
    title: "",
    message: "",
  });
  const [banner, setBanner] = useState({ msg: "", status: "info" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resolveShop = () => {
    const queryShop = new URLSearchParams(window.location.search).get("shop");
    if (queryShop) {
      window.__SHOPIFY_SHOP = queryShop;
      try {
        localStorage.setItem("shopify_shop", queryShop);
      } catch (_error) {}
      return queryShop;
    }
    if (window.__SHOPIFY_SHOP) {
      return window.__SHOPIFY_SHOP;
    }
    try {
      return localStorage.getItem("shopify_shop") || "";
    } catch (_error) {
      return "";
    }
  };

  /* ---------------- PLAN STATUS ---------------- */
  async function refreshTier() {
    if (!shop) {
      setServerTier("free");
      setLoading(false);
      return;
    }
    try {
      const endpoint = \\\`/api/public/hasActiveSubscription?shop=\\${encodeURIComponent(shop)}\\\`;
      const res = await fetch(endpoint);
      const data = await res.json();
      setServerTier(data?.tier || "free");
    } catch {
      setServerTier("free");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const resolvedShop = resolveShop();
    setShop(resolvedShop);

    const billingError = new URLSearchParams(window.location.search).get("billing_error");
    if (billingError) {
      setBanner({ msg: decodeURIComponent(billingError), status: "critical" });
    }
  }, []);

  useEffect(() => {
    refreshTier();
  }, [shop]);

  /* ---------------- CONFIRM MODAL ---------------- */
  const openConfirm = (plan) => {
    if (plan === serverTier) return;
    if (plan === "free") {
      setConfirm({
        open: true,
        target: plan,
        title: "Downgrade to Free?",
        message: "You'll keep basic Anchor Cart functionality but lose all color customization and advanced controls."
      });
      return;
    }
  };

  const redirectToPricingPlans = async () => {
    if (isSubmitting || serverTier === "premium") return;
    if (!shop) {
      setBanner({ msg: "Missing shop parameter. Reopen app from Shopify Admin.", status: "critical" });
      return;
    }
    try {
      setIsSubmitting(true);
      const redirectEndpoint = \\\`\\${window.location.origin}/api/public/createSubscription/redirect?shop=\\${encodeURIComponent(shop)}\\\`;
      redirect.dispatch(Redirect.Action.REMOTE, redirectEndpoint);
    } catch (_error) {
      setBanner({ msg: "Unable to open Shopify subscription plans.", status: "critical" });
      setIsSubmitting(false);
    }
  };

  const runConfirm = async () => {
    if (isSubmitting) return;

    const plan = confirm.target;
    setConfirm({ open: false, target: null, title: "", message: "" });

    try {
      if (plan === "free") {
        setIsSubmitting(true);
        await fetchAuth("/api/cancelSubscription");
        await refreshTier();
        setBanner({ msg: "Downgraded to Free plan", status: "success" });
      } else {
        if (!shop) {
          setBanner({ msg: "Missing shop parameter. Reopen app from Shopify Admin.", status: "critical" });
          return;
        }
        setIsSubmitting(true);
        const redirectEndpoint = \\\`\\${window.location.origin}/api/public/createSubscription/redirect?shop=\\${encodeURIComponent(shop)}\\\`;
        redirect.dispatch(Redirect.Action.REMOTE, redirectEndpoint);
        return;
      }
    } catch (err) {
      setBanner({ msg: "Action failed. Try again.", status: "critical" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const Feature = ({ enabled, children }) => (
    <Stack spacing="tight" alignment="center">
      {enabled ? tick : cross}
      <span style={{ fontSize: 15, color: enabled ? '#2c6e49' : '#8c9196' }}>{children}</span>
    </Stack>
  );

  if (loading) {
    return (
      <Frame topBar={topBarMarkup} logo={logo}>
        <SkeletonPage>
          <Layout>
            <Layout.Section oneHalf><SkeletonBodyText lines={3} /></Layout.Section>
            <Layout.Section oneHalf><SkeletonBodyText lines={3} /></Layout.Section>
          </Layout>
        </SkeletonPage>
      </Frame>
    );
  }

  return (
    <Frame topBar={topBarMarkup} logo={logo}>
      <Modal
        open={confirm.open}
        onClose={() => setConfirm({ ...confirm, open: false })}
        title={confirm.title}
        primaryAction={{
          content: "Downgrade to Free",
          onAction: runConfirm,
          loading: isSubmitting,
          disabled: isSubmitting,
        }}
        secondaryActions={[{ content: "Cancel", onAction: () => setConfirm({ ...confirm, open: false })}]}
      >
        <Modal.Section>
          <TextContainer><p>{confirm.message}</p></TextContainer>
        </Modal.Section>
      </Modal>

      {banner.msg && (
        <div style={{ margin: "20px" }}>
          <Banner
            title={banner.msg}
            status={banner.status}
            onDismiss={() => setBanner({ msg: "", status: "info" })}
          />
        </div>
      )}

      <Page fullWidth>
        
        <div style={{ textAlign: 'center', margin: '40px 0' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#002e4d', marginBottom: '8px' }}>Anchor Cart Pricing</h1>
            <p style={{ fontSize: '18px', color: '#5c5f62' }}>Start free, upgrade for full design control</p>
        </div>

        <Layout>
          
          <Layout.Section oneHalf>
            <div style={{ border: '1px solid #e1e3e5', borderRadius: '12px', padding: '30px', background: 'white', height: '100%', display: 'flex', flexDirection: 'column' }}>
                {serverTier === "free" && (
                  <div style={{ alignSelf: 'flex-start', background: "#2563EB", color: "white", padding: "4px 12px", borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', marginBottom: '16px' }}>
                    CURRENT PLAN
                  </div>
                )}
                <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#202223' }}>Basic</h2>
                <div style={{ fontSize: '42px', fontWeight: '700', marginTop: '10px', color: '#202223' }}>$0</div>
                <div style={{ color: "#6d7175", fontSize: '16px', marginBottom: '30px' }}>Free forever</div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: "#202223", marginBottom: 16 }}>Included features:</div>
                  <Stack vertical spacing="loose">
                    <Feature enabled>Price showing in sticky bar</Feature>
                    <Feature enabled>Works beautifully on mobile & desktop</Feature>
                    <Feature enabled>Basic Add to Cart button</Feature>
                    <Feature enabled={false}>Change button/bar colors</Feature>
                    <Feature enabled={false}>Template exclusions</Feature>
                  </Stack>
                </div>
                
                <div style={{ marginTop: '30px' }}>
                  <Button
                    fullWidth
                    size="large"
                    primary={serverTier === "free"}
                    disabled={serverTier === "free"}
                    onClick={() => openConfirm("free")}
                  >
                    {serverTier === "free" ? "Active" : "Downgrade to Free"}
                  </Button>
                </div>
            </div>
          </Layout.Section>

          
          <Layout.Section oneHalf>
            <div style={{ border: '2px solid #008060', borderRadius: '12px', padding: '30px', background: '#f4fbf9', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  {serverTier === "premium" && (
                    <div style={{ alignSelf: 'flex-start', background: "#008060", color: "white", padding: "4px 12px", borderRadius: '20px', fontSize: '13px', fontWeight: 'bold' }}>
                      CURRENT PLAN
                    </div>
                  )}
                  {serverTier !== "premium" && (
                     <div style={{ background: "#FFEA8A", color: "#8A6116", padding: "4px 12px", borderRadius: '20px', fontSize: '13px', fontWeight: 'bold' }}>
                        MOST POPULAR
                     </div>
                  )}
                </div>

                <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#008060' }}>Premium</h2>
                <div style={{ fontSize: '42px', fontWeight: '700', marginTop: '10px', color: '#008060' }}>$99.99<span style={{ fontSize: '18px', color: '#5c5f62' }}>/month</span></div>
                <div style={{ color: "#008060", fontSize: '16px', fontWeight: '500', marginBottom: '30px' }}>Unlock full design control</div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: "#202223", marginBottom: 16 }}>Everything in Free, plus:</div>
                  <Stack vertical spacing="loose">
                    <Feature enabled>Full color customization</Feature>
                    <Feature enabled>Template exclusion (cart, collections)</Feature>
                    <Feature enabled>Variant display controls</Feature>
                    <Feature enabled>Custom tax/price text</Feature>
                    <Feature enabled>Button border radius control</Feature>
                    <Feature enabled>Discount badge styling</Feature>
                    <Feature enabled>Priority email support</Feature>
                  </Stack>
                </div>
                
                <div style={{ marginTop: '30px' }}>
                  <Button
                    fullWidth
                    size="large"
                    primary={serverTier !== "premium"}
                    disabled={serverTier === "premium"}
                    loading={isSubmitting}
                    onClick={redirectToPricingPlans}
                  >
                    {serverTier === "premium" ? "Active" : "Upgrade to Premium"}
                  </Button>
                </div>
            </div>
          </Layout.Section>
        </Layout>

        <div style={{ marginTop: '50px' }}>
          <Card title="Feature Comparison" sectioned>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "20px", alignItems: "center" }}>
              <div style={{ fontWeight: 'bold', padding: "8px 0", borderBottom: '1px solid #e1e3e5' }}>Feature</div>
              <div style={{ fontWeight: 'bold', textAlign: "center", color: "#6B7280", borderBottom: '1px solid #e1e3e5', padding: '8px' }}>Basic</div>
              <div style={{ fontWeight: 'bold', textAlign: "center", color: "#008060", borderBottom: '1px solid #e1e3e5', padding: '8px' }}>Premium</div>
              
              {[
                ["Anchor Cart Bar", "✓", "✓"],
                ["Product Image & Title", "✗", "✓"],
                ["Mobile & Desktop", "✓", "✓"],
                ["Button Color", "Default", "Custom"],
                ["Bar Color", "Default", "Custom"],
                ["Template Exclude", "✗", "✓"],
                ["Monthly Price", "$0", "$99.99"],
              ].map(([feature, basic, premium], i) => (
                <React.Fragment key={i}>
                  <div style={{ padding: "15px 0", fontSize: '15px' }}>{feature}</div>
                  <div style={{ textAlign: "center", padding: "15px 0", fontWeight: 'bold', color: basic === "✓" || basic === "Custom" ? "#008060" : "#8c9196" }}>
                    {basic}
                  </div>
                  <div style={{ textAlign: "center", padding: "15px 0", fontWeight: 'bold', color: premium === "✓" || premium === "Custom" ? "#008060" : "black" }}>
                    {premium}
                  </div>
                </React.Fragment>
              ))}
            </div>
          </Card>
        </div>

      </Page>
    </Frame>
  );
}
`;

fs.writeFileSync('/home/theharsh/apps/anchor-cart/web/frontend/pages/index.jsx', indexJsx, 'utf8');
fs.writeFileSync('/home/theharsh/apps/anchor-cart/web/frontend/pages/Pricing.jsx', pricingJsx, 'utf8');

console.log("Files written successfully!");

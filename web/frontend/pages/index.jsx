import React, { useState, useCallback, useMemo } from "react";
import { Page, Layout, Card, TextContainer, Button, Modal, Icon, DisplayText, Frame, TopBar, Banner, Stack, Badge } from "@shopify/polaris";
import { useAuthenticatedFetch } from "../hooks";
import { Redirect } from "@shopify/app-bridge/actions";
import { useAppBridge, Toast } from "@shopify/app-bridge-react";
import { useNavigate } from "react-router-dom";
import ProductClickTracker from '../components/AnalyticsChart';
import { CircleTickMinor } from '@shopify/polaris-icons';

export default function HomePage() {
  const [active, setActive] = useState(false);
  const handleChange = useCallback(() => setActive(!active), [active]);
  const app = useAppBridge();
  const fetch = useAuthenticatedFetch();
  const redirect = Redirect.create(app);
  const [toastProps, setToastProps] = useState({ content: null });
  const navigate = useNavigate();
  
  const shop = useMemo(() => new URLSearchParams(window.location.search).get("shop"), []);
  const template = 'index'; 
  const uuid = 'eeb19ada-c040-4603-bc63-1f65e187937d'; 
  const handlePaid = 'Sticky-atc'; 

  function openThemeEditor() {
    if (!shop) return;
    const url = `https://${shop}/admin/themes/current/editor?context=apps&template=${template}&activateAppId=${uuid}/${handlePaid}`;
    window.open(url);
  }

  const goToPricingPage = () => navigate("/pricing");

  // const activator = <Button onClick={handleChange}>Open Setup Walkthrough</Button>;
  const activator = null;

  const logo = {
    width: 350,
    topBarSource: "https://i.ibb.co/Y4Ns1Rhq/Screenshot-from-2026-04-29-17-05-12.png",
    url: '/',
    accessibilityLabel: 'Apex Cart',
  };

  return (
    <Frame topBar={<TopBar />} logo={logo}>
      <Page title="Apex Cart Dashboard" titleMetadata={<Badge status="success">Active</Badge>}>
        {toastProps.content && <Toast {...toastProps} onDismiss={() => setToastProps({ content: null })} />}
        <ProductClickTracker />
        <Layout>
          
          <Layout.Section>
            <div style={{ background: "linear-gradient(135deg, #1e1e2d 0%, #004c3f 100%)", padding: "40px 30px", borderRadius: "16px", color: "white", boxShadow: "0 10px 20px rgba(0,0,0,0.15)" }}>
              <TextContainer>
                <div style={{ fontSize: "28px", fontWeight: "700", marginBottom: "15px" }}>Boost Conversions with Apex Cart</div>
                <p style={{ fontSize: "16px", opacity: 0.9, marginBottom: "25px", maxWidth: "600px" }}>
                  Never let your customers lose sight of the "Add to Cart" button. Turn passive scrollers into active buyers with a fully customizable, always-visible purchase bar.
                </p>
                <Stack spacing="base">
                  <Button primary size="large" onClick={openThemeEditor}>🚀 Enable in Theme Editor</Button>
                  <Button size="large" onClick={goToPricingPage}>⭐ View Pricing Plans</Button>
                </Stack>
              </TextContainer>
            </div>
          </Layout.Section>

          <Layout.Section oneHalf>
            <Card sectioned title="Getting Started is Easy">
              <Stack vertical spacing="loose">
                <div style={{ display: "flex", gap: "15px", alignItems: "flex-start" }}>
                  <div style={{ background: "#f4f6f8", padding: "10px", borderRadius: "8px" }}><Icon source={CircleTickMinor} color="success"/></div>
                  <div>
                    <strong style={{ fontSize: "16px", display:"block", marginBottom: "4px" }}>1. Activate App Block</strong>
                    <p style={{ color: "#6d7175", fontSize: "14px", margin: 0 }}>Open the theme editor and toggle the Apex Cart block on your product templates.</p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "15px", alignItems: "flex-start" }}>
                  <div style={{ background: "#f4f6f8", padding: "10px", borderRadius: "8px" }}><Icon source={CircleTickMinor} color="success"/></div>
                  <div>
                    <strong style={{ fontSize: "16px", display:"block", marginBottom: "4px" }}>2. Match Your Brand</strong>
                    <p style={{ color: "#6d7175", fontSize: "14px", margin: 0 }}>Change colors, text copy, and button styles directly from the Shopify editor.</p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "15px", alignItems: "flex-start" }}>
                  <div style={{ background: "#f4f6f8", padding: "10px", borderRadius: "8px" }}><Icon source={CircleTickMinor} color="highlight"/></div>
                  <div>
                    <strong style={{ fontSize: "16px", display:"block", marginBottom: "4px" }}>3. Drive Sales</strong>
                    <p style={{ color: "#6d7175", fontSize: "14px", margin: 0 }}>Watch your metrics improve as mobile users checkout faster without scrolling.</p>
                  </div>
                </div>
              </Stack>
            </Card>
          </Layout.Section>

          <Layout.Section oneHalf>
            <Card sectioned title="See it in Action">
              <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #dfe3e8', background: '#000', maxWidth: '350px', margin: '0 auto' }}>
                <video
                  src="https://cdn.shopify.com/videos/c/o/v/61131438cc4e4c19a8d674d4449d2c02.mp4"
                  controls autoPlay loop muted playsInline
                  style={{ width: '100%', display: 'block' }}
                />
              </div>
            </Card>
          </Layout.Section>

        </Layout>
      </Page>
    </Frame>
  );
}

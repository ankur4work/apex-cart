import React, { useEffect, useMemo, useState } from "react";
import { Page, Layout, Button, Frame, Icon, Banner, SkeletonPage, SkeletonBodyText, Modal, TextContainer, TopBar, Badge } from "@shopify/polaris";
import { CancelSmallMinor, CircleTickMinor } from "@shopify/polaris-icons";
import { Redirect } from "@shopify/app-bridge/actions";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useAuthenticatedFetch } from "../hooks";

export default function Pricing() {
  const app = useAppBridge();
  const fetchAuth = useAuthenticatedFetch();
  const redirect = Redirect.create(app);

  const logo = { topBarSource: "https://i.ibb.co/r2mjc3tD/image.png", width: 350, url: "/", accessibilityLabel: "Apex Cart" };
  const topBarMarkup = <TopBar showNavigationToggle />;

  const tick = useMemo(() => <Icon source={CircleTickMinor} color="success" />, []);
  const cross = useMemo(() => <Icon source={CancelSmallMinor} color="subdued" />, []);
  
  const [shop, setShop] = useState("");
  const [serverTier, setServerTier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState({ open: false, target: null, title: "", message: "" });
  const [banner, setBanner] = useState({ msg: "", status: "info" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [planInfo, setPlanInfo] = useState({ amount: "20", trialDays: 0 });

  useEffect(() => {
    fetch("/api/plan-info").then(r => r.json()).then(d => {
      setPlanInfo({ amount: parseFloat(d.amount).toFixed(0), trialDays: d.trialDays || 0 });
    }).catch(() => {});
  }, []);

  const resolveShop = () => {
    const queryShop = new URLSearchParams(window.location.search).get("shop");
    if (queryShop) {
      window.__SHOPIFY_SHOP = queryShop;
      try { localStorage.setItem("shopify_shop", queryShop); } catch (e) {}
      return queryShop;
    }
    if (window.__SHOPIFY_SHOP) return window.__SHOPIFY_SHOP;
    try { return localStorage.getItem("shopify_shop") || ""; } catch (e) { return ""; }
  };

  async function refreshTier() {
    if (!shop) { setServerTier("free"); setLoading(false); return; }
    try {
      const res = await fetch(`/api/public/hasActiveSubscription?shop=${encodeURIComponent(shop)}`);
      const data = await res.json();
      setServerTier(data?.tier || "free");
    } catch {
      setServerTier("free");
    } finally { setLoading(false); }
  }

  useEffect(() => {
    setShop(resolveShop());
    const billingError = new URLSearchParams(window.location.search).get("billing_error");
    if (billingError) setBanner({ msg: decodeURIComponent(billingError), status: "critical" });
  }, []);

  useEffect(() => { refreshTier(); }, [shop]);

  const openConfirm = (plan) => {
    if (plan === serverTier) return;
    if (plan === "free") {
      setConfirm({
        open: true, target: plan, title: "Downgrade to Free?",
        message: "You'll keep basic Apex Cart functionality but lose all advanced controls."
      });
    }
  };

  const redirectToPricingPlans = async () => {
    if (isSubmitting || serverTier === "premium") return;
    if (!shop) { setBanner({ msg: "Missing shop parameter.", status: "critical" }); return; }
    try {
      setIsSubmitting(true);
      const res = await fetchAuth("/api/billing/start");

      // Let checkHeadersForReauthorization handle re-auth silently
      if (res.status === 401 || res.status === 403) { setIsSubmitting(false); return; }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to generate subscription URL");

      if (data.isActiveSubscription) {
        await refreshTier();
        setBanner({ msg: "Already on the Premium plan.", status: "success" });
        return;
      }

      if (data.confirmationUrl) {
        redirect.dispatch(Redirect.Action.REMOTE, data.confirmationUrl);
      } else {
        throw new Error("No confirmation URL returned");
      }
    } catch (err) {
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
        await fetchAuth("/api/billing/cancel");
        await refreshTier();
        setBanner({ msg: "Downgraded to Free plan", status: "success" });
      } else {
        if (!shop) return;
          setIsSubmitting(true);
          const res = await fetchAuth("/api/billing/start");

          if (res.status === 401 || res.status === 403) { setIsSubmitting(false); return; }

          const data = await res.json();
          if (data.confirmationUrl) {
            redirect.dispatch(Redirect.Action.REMOTE, data.confirmationUrl);
          }
      }
    } catch (err) {
      setBanner({ msg: "Action failed.", status: "critical" });
    } finally { setIsSubmitting(false); }
  };

  const FeatureItem = ({ enabled, children }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
      <div style={{ flexShrink: 0 }}>{enabled ? tick : cross}</div>
      <div style={{ fontSize: '15px', color: enabled ? '#202223' : '#8c9196', textDecoration: enabled ? 'none' : 'line-through', fontWeight: enabled ? '500' : '400' }}>{children}</div>
    </div>
  );

  if (loading) {
    return (
      <Frame topBar={topBarMarkup} logo={logo}>
        <SkeletonPage title="Apex Cart Pricing">
          <Layout><Layout.Section><SkeletonBodyText lines={6} /></Layout.Section></Layout>
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
        primaryAction={{ content: "Confirm Downgrade", onAction: runConfirm, loading: isSubmitting, destructive: true }}
        secondaryActions={[{ content: "Cancel", onAction: () => setConfirm({ ...confirm, open: false })}]}
      >
        <Modal.Section><TextContainer><p>{confirm.message}</p></TextContainer></Modal.Section>
      </Modal>

      <Page>
        {banner.msg && <div style={{ marginBottom: "20px" }}><Banner title={banner.msg} status={banner.status} onDismiss={() => setBanner({ msg: "", status: "info" })} /></div>}
        
        <div style={{ textAlign: "center", marginBottom: "40px", marginTop: "20px" }}>
          <div style={{ fontSize: "36px", fontWeight: "800", color: "#111827", marginBottom: "8px" }}>Simple, transparent pricing</div>
          <p style={{ fontSize: "18px", color: "#6b7280" }}>Upgrade to Premium to fully customize your conversion experience.</p>
        </div>

        <div style={{ display: "flex", flexDirection: "row", gap: "30px", justifyContent: "center", flexWrap: "wrap", paddingBottom: "40px" }}>
          {/* Basic Plan */}
          <div style={{ width: "350px", background: "#fff", borderRadius: "16px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)", overflow: "hidden", border: serverTier === "free" ? "2px solid #2563EB" : "1px solid #e5e7eb", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "30px 30px 20px 30px", background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: "20px", fontWeight: "700", color: "#374151" }}>Basic Starter</div>
                {serverTier === "free" && <Badge status="info">Current</Badge>}
              </div>
              <div style={{ marginTop: "15px", display: "flex", alignItems: "baseline" }}>
                <span style={{ fontSize: "48px", fontWeight: "800", color: "#111827" }}>$0</span>
                <span style={{ fontSize: "16px", color: "#6b7280", marginLeft: "5px" }}>/forever</span>
              </div>
              <p style={{ marginTop: "10px", fontSize: "14px", color: "#6b7280", minHeight:"40px" }}>Standard static sticky bar for your store.</p>
            </div>
            <div style={{ padding: "30px", flexGrow: 1 }}>
              <FeatureItem enabled={true}>Show Add-to-Cart bar</FeatureItem>
              <FeatureItem enabled={true}>Responsive on all devices</FeatureItem>
              <FeatureItem enabled={true}>Base Theme Editor integration</FeatureItem>
              <FeatureItem enabled={false}>Custom Brand Colors</FeatureItem>
              <FeatureItem enabled={false}>Page Exclusions</FeatureItem>
            </div>
            <div style={{ padding: "0 30px 30px 30px" }}>
              <Button fullWidth size="large" onClick={() => openConfirm("free")} disabled={serverTier === "free"}>
                {serverTier === "free" ? "Active Plan" : "Downgrade"}
              </Button>
            </div>
          </div>

          {/* Premium Plan */}
          <div style={{ width: "380px", background: "#111827", borderRadius: "16px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)", overflow: "hidden", border: serverTier === "premium" ? "2px solid #10b981" : "2px solid transparent", transform: "scale(1.05)", zIndex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ color: "white", padding: "35px 30px 20px 30px", borderBottom: "1px solid #374151" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: "22px", fontWeight: "700" }}>PRO Control</div>
                {serverTier === "premium" ? <Badge status="success">Active</Badge> : <Badge status="warning">Popular</Badge>}
              </div>
              <div style={{ marginTop: "15px", display: "flex", alignItems: "baseline" }}>
                <span style={{ fontSize: "54px", fontWeight: "800" }}>${planInfo.amount}</span>
                <span style={{ fontSize: "16px", opacity: 0.8, marginLeft: "5px" }}>/month</span>
              </div>
              <p style={{ marginTop: "10px", fontSize: "14px", opacity: 0.9, minHeight:"40px" }}>Full styling control and zero branding.{planInfo.trialDays > 0 ? ` ${planInfo.trialDays}-day free trial.` : ""}</p>
            </div>
            <div style={{ padding: "30px", flexGrow: 1, background: "#1f2937", color: "white" }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid #374151' }}>
                <div style={{ flexShrink: 0 }}><Icon source={CircleTickMinor} color="highlight" /></div>
                <div style={{ fontSize: '15px', color: '#f9fafb', fontWeight: '500' }}>Everything in Basic</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid #374151' }}>
                <div style={{ flexShrink: 0 }}><Icon source={CircleTickMinor} color="highlight" /></div>
                <div style={{ fontSize: '15px', color: '#f9fafb', fontWeight: '500' }}>Complete Color Customization</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid #374151' }}>
                <div style={{ flexShrink: 0 }}><Icon source={CircleTickMinor} color="highlight" /></div>
                <div style={{ fontSize: '15px', color: '#f9fafb', fontWeight: '500' }}>Product Target Exclusions</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid #374151' }}>
                <div style={{ flexShrink: 0 }}><Icon source={CircleTickMinor} color="highlight" /></div>
                <div style={{ fontSize: '15px', color: '#f9fafb', fontWeight: '500' }}>Dynamic Variant Displays</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid #374151' }}>
                <div style={{ flexShrink: 0 }}><Icon source={CircleTickMinor} color="highlight" /></div>
                <div style={{ fontSize: '15px', color: '#f9fafb', fontWeight: '500' }}>Priority 24/7 Support</div>
              </div>
            </div>
            <div style={{ padding: "0 30px 30px 30px", background: "#1f2937" }}>
              <Button fullWidth size="large" primary onClick={redirectToPricingPlans} loading={isSubmitting} disabled={serverTier === "premium"}>
                {serverTier === "premium" ? "Premium Active" : "Upgrade to Pro"}
              </Button>
            </div>
          </div>
        </div>
      </Page>
    </Frame>
  );
}

import {
    Banner
  } from "@shopify/polaris";
  import { useState, useCallback } from "react";
  import { useAppQuery, useAuthenticatedFetch } from "../hooks";
  import $ from 'jquery';
  
  
  export function ActiveSubscription() {
    const [isLoading, setIsLoading] = useState(true);
  
    const {
      data,
      isLoading: isLoadingCount,
    } = useAppQuery({
      url: "/api/hasActiveSubscription",
      reactQueryOptions: {
        onSuccess: () => {
          setIsLoading(false);
        },
      },
    });
  
    console.log("hasActiveSubscription:", data?.hasActiveSubscription);
  
    if (data?.hasActiveSubscription === false) {
      $('.Polaris-Button--primary').show();
    } else if (data?.hasActiveSubscription === true) {
      $('.Polaris-Button--destructive').show();
    }
  
    function handleDismiss() {
      console.log("dismiss clicked");
      document.getElementById('subscriptionBanner').remove();
    }
  
  
    return (
      <div id="subscriptionBanner">
  
        {isLoadingCount ? "" :
          data?.hasActiveSubscription ?
            <Banner title="Current Plan: MeroxIO Premium" status="success" onDismiss={() => { handleDismiss() }}>
              <p>Congratulations🎉🎉, You are now our pro <strong>MeroxIO Premium</strong> customer and can access all features of this app without any limitation.</p>
              
  
            </Banner>
            :
            <Banner title="Current Plan: Free" status="warning" onDismiss={() => { handleDismiss() }}>
              <p>- You are currently on Free plan with limited features.</p>
              <p>- <strong>Enable Steps: </strong> Open Theme Customization &gt; Select Add Section &gt; Move To Wishlist </p>
              <p>- Compare plans below for better insights. </p>
              <p>- We are running 7 days free trial for <strong>MeroxIO Premium</strong> plan, Grab the deal now!!</p>
  
            </Banner>
        }
  
  
      </div>
  
    );
  }
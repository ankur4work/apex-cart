import React, { useState, useEffect } from "react";
import axios from "axios";
import "./AnalyticsChart.css";

const ProductClickTracker = () => {
  const [shop, setShop] = useState(null);
  const [productCount, setProductCount] = useState(null);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState("all_time");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const shopParam = urlParams.get("shop")
      || window.__SHOPIFY_SHOP
      || (() => { try { return localStorage.getItem("shopify_shop"); } catch(e) { return null; } })();

    if (shopParam) {
      if (window.__SHOPIFY_SHOP !== shopParam) { try { localStorage.setItem("shopify_shop", shopParam); } catch(e) {} }
      window.__SHOPIFY_SHOP = shopParam;
      setShop(shopParam);
    } else {
      setError("Shop parameter is missing from the URL.");
    }
  }, []);

  const fetchProductCount = async (range) => {
    if (!shop) return;

    try {
      setError(null); // Clear previous errors

      const params = { shop };
      if (range !== "all_time") {
        const currentDate = new Date();
        let startDate;
        const endDate = currentDate.toISOString().split("T")[0]; // Today's date

        // Calculate start date based on the selected range
        switch (range) {
          case "last_day":
            startDate = new Date(currentDate.setDate(currentDate.getDate() - 1))
              .toISOString()
              .split("T")[0];
            break;
          case "last_10_days":
            startDate = new Date(currentDate.setDate(currentDate.getDate() - 10))
              .toISOString()
              .split("T")[0];
            break;
          case "last_30_days":
            startDate = new Date(currentDate.setDate(currentDate.getDate() - 30))
              .toISOString()
              .split("T")[0];
            break;
          case "last_year":
            startDate = new Date(currentDate.setFullYear(currentDate.getFullYear() - 1))
              .toISOString()
              .split("T")[0];
            break;
          default:
            startDate = null;
        }

        if (startDate) {
          params.startDate = startDate;
          params.endDate = endDate;
        }
      }

      const response = await axios.get("/api/store-atc-count", { params });
      setProductCount(response.data.productCount);
    } catch (err) {
      console.error("Error fetching product count:", err.message);
      setError("Failed to fetch product count. Please try again.");
    }
  };

  useEffect(() => {
    fetchProductCount(dateRange);
  }, [shop, dateRange]);

  return (
    <div className="analytics-chart-container">
      <div className="click-count-or-time">
        <h2 className="analytics-chart-heading">Total Add to Cart Clicks</h2>
        <div className="time-range-selector">
        <select
          className="date-range-dropdown"
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
        >
          <option value="all_time">All Time</option>
          <option value="last_day">Yesterday</option>
          <option value="last_10_days">Last 10 Days</option>
          <option value="last_30_days">Last 30 Days</option>
          <option value="last_year">Last Year</option>
        </select>
        </div>
      </div>

      <div className="atc-click-count-container">
          {productCount !== null && !error && (
            <p className="atc-click-count">
              {productCount}
            </p>
          )}
          {error && <p className="mt-4 text-red-500">{error}</p>}
        </div>
    </div>
  );
};

export default ProductClickTracker;

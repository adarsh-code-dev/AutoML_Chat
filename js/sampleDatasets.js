/**
 * DataMind AutoML - Sample Datasets Module
 * Pre-loaded realistic sample datasets for instant 1-click testing.
 */

window.SampleDatasets = {

  churn: {
    filename: 'Customer_Churn_Dataset.csv',
    type: 'csv',
    content: `CustomerID,Tenure,MonthlyCharges,TotalCharges,Contract,TechSupport,PaperlessBilling,PaymentMethod,Churn
CUST-101,1,29.85,29.85,Month-to-month,No,Yes,Electronic check,Yes
CUST-102,34,56.95,1889.5,One year,Yes,No,Mailed check,No
CUST-103,2,53.85,108.15,Month-to-month,No,Yes,Mailed check,Yes
CUST-104,45,42.3,1840.75,One year,Yes,No,Bank transfer,No
CUST-105,2,70.7,151.65,Month-to-month,No,Yes,Electronic check,Yes
CUST-106,8,99.65,820.5,Month-to-month,No,Yes,Electronic check,Yes
CUST-107,22,89.1,1949.4,Month-to-month,No,Yes,Credit card,No
CUST-108,10,29.75,301.9,Month-to-month,No,No,Mailed check,No
CUST-109,28,104.8,3046.05,Month-to-month,Yes,Yes,Electronic check,Yes
CUST-110,62,56.15,3487.95,One year,No,No,Bank transfer,No
CUST-111,13,49.95,587.45,Month-to-month,No,No,Electronic check,No
CUST-112,16,18.95,326.8,Two year,Yes,No,Mailed check,No
CUST-113,58,100.35,5681.1,One year,No,No,Credit card,No
CUST-114,49,103.7,5036.3,Month-to-month,No,Yes,Bank transfer,Yes
CUST-115,25,105.5,2686.05,Month-to-month,Yes,Yes,Electronic check,No
CUST-116,69,113.25,7895.15,Two year,Yes,No,Bank transfer,No
CUST-117,52,20.65,1022.95,One year,No,No,Mailed check,No
CUST-118,71,106.7,7382.25,Two year,Yes,No,Credit card,No
CUST-119,10,55.2,528.35,Month-to-month,No,No,Credit card,No
CUST-120,21,90.05,1862.9,Month-to-month,No,Yes,Electronic check,No
CUST-121,12,19.8,245.0,Month-to-month,No,No,Bank transfer,No
CUST-122,65,109.5,7200.0,Two year,Yes,Yes,Credit card,No
CUST-123,4,85.2,340.8,Month-to-month,No,Yes,Electronic check,Yes
CUST-124,50,68.9,3450.0,One year,Yes,No,Bank transfer,No
CUST-125,3,92.4,277.2,Month-to-month,No,Yes,Electronic check,Yes`
  },

  housing: {
    filename: 'House_Price_Valuation.csv',
    type: 'csv',
    content: `PropertyID,SquareFeet,Bedrooms,Bathrooms,AgeYears,GarageCapacity,Neighborhood,DistanceCityCenter,PriceUSD
PROP-1,1850,3,2,10,2,Suburban,12.4,345000
PROP-2,2400,4,3,5,2,Urban,4.2,520000
PROP-3,1200,2,1,25,1,Suburban,18.0,210000
PROP-4,3100,5,4,2,3,Downtown,2.1,890000
PROP-5,1600,3,2,15,1,Suburban,14.5,285000
PROP-6,2100,4,2.5,8,2,Urban,6.5,460000
PROP-7,2800,4,3.5,4,3,Downtown,3.0,750000
PROP-8,1450,3,1.5,20,1,Suburban,15.2,250000
PROP-9,3500,5,4.5,1,3,Downtown,1.5,1050000
PROP-10,1950,3,2,12,2,Urban,8.1,380000
PROP-11,2250,4,2.5,6,2,Suburban,10.0,430000
PROP-12,1100,2,1,30,0,Rural,25.0,175000
PROP-13,2600,4,3,7,2,Urban,5.5,580000
PROP-14,1750,3,2,14,2,Suburban,11.8,320000
PROP-15,3000,4,3.5,3,3,Downtown,2.8,820000`
  },

  sales: {
    filename: 'ECommerce_Sales_Trend.csv',
    type: 'csv',
    content: `Date,DailyOrders,AvgOrderValue,MarketingSpend,WebsiteTraffic,RevenueUSD
2026-01-01,120,45.5,500,3200,5460
2026-01-02,135,48.0,550,3500,6480
2026-01-03,142,50.2,600,3800,7128
2026-01-04,110,44.0,450,2900,4840
2026-01-05,155,52.5,700,4200,8137
2026-01-06,160,51.0,720,4350,8160
2026-01-07,175,54.0,800,4800,9450
2026-01-08,168,53.2,780,4650,8937
2026-01-09,180,55.0,850,5000,9900
2026-01-10,195,58.0,900,5400,11310
2026-01-11,210,60.0,950,5800,12600
2026-01-12,205,59.5,920,5650,12197
2026-01-13,220,62.0,1000,6100,13640
2026-01-14,235,64.5,1050,6500,15157
2026-01-15,240,65.0,1100,6700,15600`
  },

  customers: {
    filename: 'Customer_Segmentation.csv',
    type: 'csv',
    content: `CustomerID,Age,AnnualIncomeK,SpendingScore,FamilySize
CUST-001,19,15,39,1
CUST-002,21,15,81,1
CUST-003,20,16,6,2
CUST-004,23,16,77,2
CUST-005,31,17,40,3
CUST-006,22,17,76,1
CUST-007,35,18,6,4
CUST-008,23,18,94,1
CUST-009,64,19,3,2
CUST-010,30,19,72,2
CUST-011,67,19,14,2
CUST-012,35,19,99,3
CUST-013,58,20,15,4
CUST-014,24,20,77,1
CUST-015,37,20,13,3
CUST-016,22,20,79,1
CUST-017,35,21,35,2
CUST-018,20,21,66,1
CUST-019,52,23,29,3
CUST-020,35,23,98,2`
  }
};

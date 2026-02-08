'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBusiness } from '@/contexts/BusinessContext';
import { createClient } from '@/supabase/client';
import { ArrowLeft, Loader2, Printer, Download, DollarSign, CreditCard, Smartphone, TrendingUp, Package } from 'lucide-react';

type ReportMode = 'daily' | 'monthly';

interface Sale {
  id: string;
  total_amount: number;
  tax_amount: number;
  payment_method: string;
  created_at: string;
}

interface SaleItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  product?: {
    name: string;
    tax_type: string | null;
  };
}

interface ProductPerformance {
  product_id: string;
  product_name: string;
  total_quantity: number;
  total_revenue: number;
}

export default function DailySummaryPage() {
  const router = useRouter();
  const { businessId, businessName } = useBusiness();
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<ReportMode>('daily');
  const [sales, setSales] = useState<Sale[]>([]);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const supabase = createClient();

  /**
   * IMPORTANT: Fix UTC vs Local bug by calculating ranges in CAT (UTC+2),
   * then converting to UTC ISO strings for Supabase filtering.
   */
  const CAT_OFFSET_MINUTES = 120; // Africa/Lusaka is CAT (UTC+2)

  const getCatNowParts = () => {
    const now = new Date();
    // Shift "now" by +02:00, then read parts using UTC getters (gives CAT calendar parts).
    const catNow = new Date(now.getTime() + CAT_OFFSET_MINUTES * 60_000);
    return {
      year: catNow.getUTCFullYear(),
      month: catNow.getUTCMonth(), // 0-based
      day: catNow.getUTCDate(),
    };
  };

  const toUtcISOStringFromCat = (
    year: number,
    month0: number,
    day: number,
    hour: number,
    minute: number,
    second: number,
    ms: number
  ) => {
    // CAT is UTC+2, so UTC = CAT - 2 hours
    return new Date(Date.UTC(year, month0, day, hour - 2, minute, second, ms)).toISOString();
  };

  const getRange = (reportMode: ReportMode) => {
    const { year, month, day } = getCatNowParts();

    if (reportMode === 'daily') {
      return {
        start: toUtcISOStringFromCat(year, month, day, 0, 0, 0, 0),
        end: toUtcISOStringFromCat(year, month, day, 23, 59, 59, 999),
      };
    }

    // monthly
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    return {
      start: toUtcISOStringFromCat(year, month, 1, 0, 0, 0, 0),
      end: toUtcISOStringFromCat(year, month, lastDay, 23, 59, 59, 999),
    };
  };

  const formatPeriodLabel = (reportMode: ReportMode) => {
    // Prefer explicit CAT timezone formatting if available in browser.
    try {
      const options: Intl.DateTimeFormatOptions =
        reportMode === 'daily'
          ? { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Africa/Lusaka' }
          : { year: 'numeric', month: 'long', timeZone: 'Africa/Lusaka' };
      return new Intl.DateTimeFormat('en-US', options).format(new Date());
    } catch {
      // Fallback: format based on CAT-shifted "now"
      const { year, month, day } = getCatNowParts();
      const d = new Date(Date.UTC(year, month, day, 12, 0, 0, 0));
      return reportMode === 'daily'
        ? d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return `K${amount.toFixed(2)}`;
  };

  // Fetch report data (Daily or Monthly)
  useEffect(() => {
    if (businessId) {
      fetchReportData(mode);
    }
  }, [businessId, mode]);

  const fetchReportData = async (reportMode: ReportMode) => {
    if (!businessId) return;

    try {
      setLoading(true);
      const { start, end } = getRange(reportMode);

      // Fetch sales in selected period (CAT day/month boundaries converted to UTC)
      // Exclude voided sales from revenue calculations
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('id, total_amount, tax_amount, payment_method, created_at')
        .eq('business_id', businessId)
        .gte('created_at', start)
        .lte('created_at', end)
        .neq('status', 'voided') // Exclude voided sales
        .order('created_at', { ascending: false });

      if (salesError) {
        console.error('Error fetching sales:', salesError);
      } else if (salesData) {
        setSales(salesData);

        // Fetch all sale items for these sales
        const saleIds = salesData.map((sale) => sale.id);
        if (saleIds.length > 0) {
          const { data: itemsData, error: itemsError } = await supabase
            .from('sale_items')
            .select(`
              id,
              sale_id,
              product_id,
              quantity,
              unit_price,
              products:product_id (
                name,
                tax_type
              )
            `)
            .in('sale_id', saleIds);

          if (itemsError) {
            console.error('Error fetching sale items:', itemsError);
          } else if (itemsData) {
            // Transform the data
            const transformedItems = itemsData.map((item: any) => ({
              id: item.id,
              sale_id: item.sale_id,
              product_id: item.product_id,
              quantity: item.quantity,
              unit_price: item.unit_price,
              product: {
                name: item.products?.name || 'Unknown Product',
                tax_type: item.products?.tax_type || null,
              },
            }));
            setSaleItems(transformedItems);
          }
        } else {
          setSaleItems([]);
        }
      }
    } catch (err) {
      console.error('Error fetching daily data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals
  const totalRevenue = sales.reduce((sum, sale) => sum + sale.total_amount, 0);
  const cashCollected = sales
    .filter((sale) => sale.payment_method?.toLowerCase() === 'cash')
    .reduce((sum, sale) => sum + sale.total_amount, 0);
  const mobileMoney = sales
    .filter((sale) => sale.payment_method?.toLowerCase() === 'mobile' || sale.payment_method?.toLowerCase() === 'mobile_money')
    .reduce((sum, sale) => sum + sale.total_amount, 0);

  // Calculate tax summary
  const calculateTaxSummary = () => {
    let standardTotal = 0;
    let vatCollected = 0;
    let exemptZeroTotal = 0;

    saleItems.forEach((item) => {
      const itemTotal = item.unit_price * item.quantity;
      const taxType = item.product?.tax_type;

      if (taxType === 'standard') {
        standardTotal += itemTotal;
        // Calculate VAT for standard items
        const itemVAT = itemTotal - (itemTotal / 1.16);
        vatCollected += itemVAT;
      } else if (taxType === 'zero_rated' || taxType === 'exempt') {
        exemptZeroTotal += itemTotal;
      }
    });

    return { standardTotal, vatCollected, exemptZeroTotal };
  };

  const { standardTotal, vatCollected, exemptZeroTotal } = calculateTaxSummary();

  // Calculate top 5 products by quantity
  const getTopProducts = (): ProductPerformance[] => {
    const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();

    saleItems.forEach((item) => {
      const productId = item.product_id;
      const productName = item.product?.name || 'Unknown Product';
      const quantity = item.quantity;
      const revenue = item.unit_price * item.quantity;

      if (productMap.has(productId)) {
        const existing = productMap.get(productId)!;
        productMap.set(productId, {
          name: productName,
          quantity: existing.quantity + quantity,
          revenue: existing.revenue + revenue,
        });
      } else {
        productMap.set(productId, {
          name: productName,
          quantity,
          revenue,
        });
      }
    });

    return Array.from(productMap.entries())
      .map(([product_id, data]) => ({
        product_id,
        product_name: data.name,
        total_quantity: data.quantity,
        total_revenue: data.revenue,
      }))
      .sort((a, b) => b.total_quantity - a.total_quantity)
      .slice(0, 5);
  };

  const topProducts = getTopProducts();

  // Print/Download handler
  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const reportTitle = mode === 'daily' ? 'DAILY Z-REPORT' : 'MONTHLY Z-REPORT';
    const periodLabel = formatPeriodLabel(mode);
    const topProductsLabel = mode === 'daily' ? 'TOP 5 PRODUCTS (TODAY)' : 'TOP 5 PRODUCTS (THIS MONTH)';
    // Create a text summary
    const summary = `
${reportTitle}
${businessName || 'Shop'}
Period: ${periodLabel}

BIG NUMBERS
Total Revenue: ${formatCurrency(totalRevenue)}
Cash Collected: ${formatCurrency(cashCollected)}
Mobile Money: ${formatCurrency(mobileMoney)}

TAX SUMMARY
Total Standard (16%) Sales: ${formatCurrency(standardTotal)}
Total VAT Collected: ${formatCurrency(vatCollected)}
Total Exempt/Zero-Rated Sales: ${formatCurrency(exemptZeroTotal)}

${topProductsLabel}
${topProducts.map((p, i) => `${i + 1}. ${p.product_name} - Qty: ${p.total_quantity} - Revenue: ${formatCurrency(p.total_revenue)}`).join('\n')}

Generated: ${new Date().toLocaleString()}
    `;

    // Create blob and download
    const blob = new Blob([summary], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `z-report-${mode}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin h-8 w-8 text-emerald-600" />
          <p className="text-gray-600">Loading daily summary...</p>
        </div>
      </div>
    );
  }

  return (
    // FIX 1: Nuclear Layout Fix (Strictly contained wrapper)
    <div className="w-full max-w-[100vw] overflow-x-hidden min-h-screen bg-gray-50">
      
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 w-full">
        <div className="flex items-center justify-between p-4 max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {mode === 'daily' ? 'Daily Z-Report' : 'Monthly Z-Report'}
              </h1>
              <p className="text-sm text-gray-600">{formatPeriodLabel(mode)}</p>
            </div>
          </div>
        </div>
        {/* Mode Toggle */}
        <div className="px-4 pb-4 max-w-5xl mx-auto">
          <div className="inline-flex rounded-lg bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setMode('daily')}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                mode === 'daily' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Daily
            </button>
            <button
              type="button"
              onClick={() => setMode('monthly')}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                mode === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6 print:p-0 w-full max-w-5xl mx-auto pb-24">
        {/* Big Numbers Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:grid-cols-3">
          <div className="bg-white rounded-lg p-6 shadow-sm border-2 border-emerald-500 print:border print:border-gray-300">
            <div className="flex items-center justify-between mb-3">
              <DollarSign className="w-8 h-8 text-emerald-600" />
            </div>
            <p className="text-3xl font-extrabold text-gray-900 mb-1">
              {formatCurrency(totalRevenue)}
            </p>
            <p className="text-sm font-semibold text-gray-600">Total Revenue</p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border-2 border-blue-500 print:border print:border-gray-300">
            <div className="flex items-center justify-between mb-3">
              <CreditCard className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-3xl font-extrabold text-gray-900 mb-1">
              {formatCurrency(cashCollected)}
            </p>
            <p className="text-sm font-semibold text-gray-600">Cash Collected</p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border-2 border-purple-500 print:border print:border-gray-300">
            <div className="flex items-center justify-between mb-3">
              <Smartphone className="w-8 h-8 text-purple-600" />
            </div>
            <p className="text-3xl font-extrabold text-gray-900 mb-1">
              {formatCurrency(mobileMoney)}
            </p>
            <p className="text-sm font-semibold text-gray-600">Mobile Money</p>
          </div>
        </div>

        {/* Tax Summary Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 print:shadow-none print:border print:border-gray-300 w-full">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            Tax Summary
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-700 font-medium">Total Standard (16%) Sales</span>
              <span className="text-xl font-bold text-gray-900">{formatCurrency(standardTotal)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-700 font-medium">Total VAT Collected</span>
              <span className="text-xl font-bold text-emerald-600">{formatCurrency(vatCollected)}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-700 font-medium">Total Exempt/Zero-Rated Sales</span>
              <span className="text-xl font-bold text-gray-900">{formatCurrency(exemptZeroTotal)}</span>
            </div>
          </div>
        </div>

        {/* Product Performance */}
        <div className="bg-white rounded-lg shadow-sm p-6 print:shadow-none print:border print:border-gray-300 w-full overflow-hidden">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-600" />
            {mode === 'daily' ? 'Top 5 Products Sold Today' : 'Top 5 Products This Month'}
          </h2>
          {topProducts.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              {mode === 'daily' ? 'No products sold today' : 'No products sold this month'}
            </p>
          ) : (
            <div className="space-y-3 w-full">
              {topProducts.map((product, index) => (
                // FIX 2: min-w-0 on flex items prevents blowout
                <div
                  key={product.product_id}
                  className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 w-full min-w-0"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate pr-2">{product.product_name}</p>
                      <p className="text-sm text-gray-500">Qty: {product.total_quantity}</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-emerald-600 ml-2 whitespace-nowrap">
                    {formatCurrency(product.total_revenue)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 print:hidden">
          <button
            onClick={handlePrint}
            className="flex-1 bg-white border-2 border-gray-300 text-gray-700 py-4 rounded-lg font-bold text-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <Printer className="w-5 h-5" />
            Print Summary
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 bg-emerald-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            Download Summary
          </button>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white;
          }
          .print\\:hidden {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
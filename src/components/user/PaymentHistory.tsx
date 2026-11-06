import React, { useEffect, useState, useMemo } from 'react';
import { subscriptionService } from '../../services/subscription-service';
import { CourseSubscription } from '../../types';
import { useApp } from '../../context/AppContext';
import { 
  Receipt, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Search, 
  RefreshCw, 
  FileText, 
  Printer, 
  X, 
  CreditCard,
  ShieldCheck,
  Calendar,
  DollarSign,
  Download
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { DataNotFound } from '../common/DataNotFound';
import { BrandLogo } from '../common/BrandLogo';
import { resolveBrandingLogoUrl } from '../../lib/branding';

const loadLogoAsDataURL = (url: string): Promise<{ dataUrl: string; width: number; height: number } | null> => {
  return new Promise((resolve) => {
    const processImage = (img: HTMLImageElement) => {
      try {
        const canvas = document.createElement('canvas');
        const w = img.naturalWidth || img.width || 120;
        const h = img.naturalHeight || img.height || 120;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve({
            dataUrl: canvas.toDataURL('image/png'),
            width: w,
            height: h
          });
          return;
        }
      } catch (e) {
        console.warn('Canvas toDataURL failed for logo:', e);
      }
      resolve(null);
    };

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => processImage(img);
    img.onerror = () => {
      if (url !== '/logo/logo.png') {
        const fallbackImg = new Image();
        fallbackImg.crossOrigin = 'Anonymous';
        fallbackImg.onload = () => processImage(fallbackImg);
        fallbackImg.onerror = () => resolve(null);
        fallbackImg.src = '/logo/logo.png';
      } else {
        resolve(null);
      }
    };
    img.src = url;
  });
};

export const PaymentHistory: React.FC = () => {
  const { currentUser, formatPrice, logoUrl } = useApp();
  const [subscriptions, setSubscriptions] = useState<CourseSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');

  // Selected subscription for receipt modal
  const [selectedSub, setSelectedSub] = useState<CourseSubscription | null>(null);

  const fetchHistory = async (showRefreshSpinner = false) => {
    if (!currentUser) return;
    try {
      if (showRefreshSpinner) setRefreshing(true);
      else setLoading(true);
      
      setError(null);
      const data = await subscriptionService.getStudentSubscriptions(currentUser.id, currentUser.email);
      // Sort by enrolledAt descending
      const sorted = data.sort((a, b) => new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime());
      setSubscriptions(sorted);
    } catch (err: any) {
      console.error('Error fetching payment history:', err);
      setError(err.message || 'Failed to load payment history.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [currentUser]);

  // Filtered subscriptions list (showing active payments only)
  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter(sub => {
      // Exclude non-active transactions
      if (sub.status !== 'active') return false;

      const q = searchQuery.toLowerCase().trim();
      return !q || 
        sub.courseTitle.toLowerCase().includes(q) ||
        (sub.transactionCode && sub.transactionCode.toLowerCase().includes(q)) ||
        (sub.id && sub.id.toLowerCase().includes(q)) ||
        (sub.paymentMethod && sub.paymentMethod.toLowerCase().includes(q));
    });
  }, [subscriptions, searchQuery]);

  // Financial Stats
  const totalSpent = useMemo(() => {
    return subscriptions
      .filter(s => s.status === 'active')
      .reduce((sum, s) => sum + (s.coursePrice || 0), 0);
  }, [subscriptions]);

  const activeCount = useMemo(() => {
    return subscriptions.filter(s => s.status === 'active').length;
  }, [subscriptions]);

  const receiptRef = React.useRef<HTMLDivElement>(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const handleDownloadPDF = async () => {
    if (!selectedSub) return;
    setDownloadingPDF(true);
    try {
      const totalPaid = selectedSub.coursePrice || 0;
      const subtotal = totalPaid / 1.16;
      const vatAmount = totalPaid - subtotal;
      const datePaidStr = selectedSub.enrolledAt 
        ? new Date(selectedSub.enrolledAt).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          })
        : new Date().toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          });

      const invoiceNum = `INV-${(selectedSub.id || '').replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase() || '7B9OLT66-0001'}`;
      const receiptNum = selectedSub.transactionCode || `2829-${(selectedSub.id || '').replace(/[^0-9]/g, '').slice(-8) || '3809-8276'}`;
      const customerName = currentUser.name || currentUser.fullName || 'mike kenyanya';
      const customerEmail = currentUser.email || 'michaelomare045@gmail.com';
      const paymentMethodStr = (selectedSub.paymentMethod || 'M-PESA / VISA').toUpperCase();
      const courseTitleStr = selectedSub.courseTitle || 'Course Access & Certification';

      let pdfGenerated = false;

      // 1. Try canvas-based capture if element is mounted
      if (receiptRef.current) {
        try {
          const element = receiptRef.current;
          const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            allowTaint: false,
            logging: false,
            backgroundColor: '#FFFFFF',
            imageTimeout: 5000,
            windowWidth: 1200,
            onclone: (clonedDoc) => {
              const clonedEl = clonedDoc.querySelector('[data-receipt-container]') as HTMLElement;
              if (clonedEl) {
                clonedEl.style.backgroundColor = '#FFFFFF';
                clonedEl.style.color = '#0F172A';
              }
            }
          });

          const imgData = canvas.toDataURL('image/png');
          if (imgData && imgData.length > 500) {
            const pdf = new jsPDF({
              orientation: 'portrait',
              unit: 'mm',
              format: 'a4'
            });

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 10;
            const imgWidth = pageWidth - (margin * 2);
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            const finalHeight = Math.min(imgHeight, pageHeight - (margin * 2));

            pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, finalHeight);
            const refCode = receiptNum.replace(/[^a-zA-Z0-9]/g, '_');
            pdf.save(`UQlearn_Receipt_${refCode}.pdf`);
            pdfGenerated = true;
          }
        } catch (canvasErr) {
          console.warn('html2canvas capture notice, using direct vector PDF generator fallback:', canvasErr);
        }
      }

      // 2. Direct Vector jsPDF Generator (Bulletproof 100% Reliable Fallback)
      if (!pdfGenerated) {
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });

        // Brand & Theme Colors (RGB)
        const DARK = [15, 23, 42];        // #0f172a
        const MUTED = [100, 116, 139];    // #64748b
        const LIGHT_BG = [248, 250, 252]; // #f8fafc
        const BORDER = [226, 232, 240];   // #e2e8f0
        const TEAL = [13, 148, 136];      // #0d9488
        const PURPLE = [147, 51, 234];    // #9333ea

        // --- HEADER ---
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(22);
        pdf.setTextColor(DARK[0], DARK[1], DARK[2]);
        pdf.text('Receipt', 15, 22);

        // Centered Logo Image & UQlearn Brand Text
        const targetLogoSrc = resolveBrandingLogoUrl(logoUrl);
        const logoResult = await loadLogoAsDataURL(targetLogoSrc);

        if (logoResult && logoResult.dataUrl) {
          const targetHeight = 16; 
          const targetWidth = Math.min((logoResult.width / logoResult.height) * targetHeight, 44);
          const logoX = 105 - (targetWidth / 2); // Centered on A4 (210mm width)
          pdf.addImage(logoResult.dataUrl, 'PNG', logoX, 6, targetWidth, targetHeight);
        }

        // Text "UQlearn" below centered logo
        pdf.setFontSize(15);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(TEAL[0], TEAL[1], TEAL[2]);
        pdf.text('UQ', 96, 27);
        pdf.setTextColor(PURPLE[0], PURPLE[1], PURPLE[2]);
        pdf.text('learn', 105, 27);

        // Header Line
        pdf.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
        pdf.setLineWidth(0.4);
        pdf.line(15, 33, 195, 33);

        // --- METADATA & ADDRESS (Two Columns) ---
        let y = 41;
        pdf.setFontSize(9);

        // Left Column: Metadata
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
        pdf.text('Invoice number:', 15, y);
        pdf.setTextColor(DARK[0], DARK[1], DARK[2]);
        pdf.setFont('helvetica', 'bold');
        pdf.text(invoiceNum, 48, y);

        y += 5.5;
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
        pdf.text('Receipt number:', 15, y);
        pdf.setTextColor(DARK[0], DARK[1], DARK[2]);
        pdf.setFont('helvetica', 'bold');
        pdf.text(receiptNum, 48, y);

        y += 5.5;
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
        pdf.text('Date paid:', 15, y);
        pdf.setTextColor(DARK[0], DARK[1], DARK[2]);
        pdf.text(datePaidStr, 48, y);

        y += 5.5;
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
        pdf.text('VAT Registration:', 15, y);
        pdf.setTextColor(DARK[0], DARK[1], DARK[2]);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Kenya VAT: P052579113H', 48, y);

        // Company Address (below left metadata)
        y += 8;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9.5);
        pdf.setTextColor(DARK[0], DARK[1], DARK[2]);
        pdf.text('UQlearn Limited', 15, y);

        y += 4.5;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8.5);
        pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
        pdf.text('Mashauri Road, GHUDKA Building', 15, y);
        y += 4;
        pdf.text('Kisii Central District, Kisii County', 15, y);
        y += 4;
        pdf.text('40200, Kenya', 15, y);
        y += 4;
        pdf.text('support@uqlearn.org', 15, y);

        // Right Column: Bill To (x = 125)
        let rightY = 36;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9.5);
        pdf.setTextColor(DARK[0], DARK[1], DARK[2]);
        pdf.text('Bill to', 125, rightY);

        rightY += 5;
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.text(customerName, 125, rightY);

        rightY += 4.5;
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
        pdf.text(customerEmail, 125, rightY);

        // --- PAID STATEMENT ---
        y = Math.max(y, rightY) + 10;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(13);
        pdf.setTextColor(DARK[0], DARK[1], DARK[2]);
        pdf.text(`${formatPrice(totalPaid)} paid on ${datePaidStr}`, 15, y);

        // --- LINE ITEMS TABLE ---
        y += 8;
        pdf.setFillColor(LIGHT_BG[0], LIGHT_BG[1], LIGHT_BG[2]);
        pdf.rect(15, y, 180, 7, 'F');
        
        pdf.setDrawColor(DARK[0], DARK[1], DARK[2]);
        pdf.setLineWidth(0.4);
        pdf.line(15, y + 7, 195, y + 7);

        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(DARK[0], DARK[1], DARK[2]);
        pdf.text('DESCRIPTION', 18, y + 5);
        pdf.text('QTY', 110, y + 5);
        pdf.text('UNIT PRICE', 135, y + 5, { align: 'right' });
        pdf.text('TAX', 160, y + 5, { align: 'right' });
        pdf.text('AMOUNT', 192, y + 5, { align: 'right' });

        // Item Row
        y += 13;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.setTextColor(DARK[0], DARK[1], DARK[2]);
        pdf.text(courseTitleStr.length > 50 ? courseTitleStr.slice(0, 48) + '...' : courseTitleStr, 18, y);
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7.5);
        pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
        pdf.text(`${datePaidStr} – Lifetime Access`, 18, y + 4);

        pdf.setFontSize(8.5);
        pdf.setTextColor(DARK[0], DARK[1], DARK[2]);
        pdf.text('1', 110, y);
        pdf.text(formatPrice(subtotal), 135, y, { align: 'right' });
        pdf.text('16%', 160, y, { align: 'right' });
        pdf.text(formatPrice(subtotal), 192, y, { align: 'right' });

        y += 9;
        pdf.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
        pdf.setLineWidth(0.3);
        pdf.line(15, y, 195, y);

        // --- SUBTOTALS BREAKDOWN ---
        y += 6;
        const startXLeft = 110;
        const startXRight = 192;

        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
        pdf.text('Subtotal', startXLeft, y);
        pdf.setTextColor(DARK[0], DARK[1], DARK[2]);
        pdf.text(formatPrice(subtotal), startXRight, y, { align: 'right' });

        y += 4.5;
        pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
        pdf.text('Total excluding tax', startXLeft, y);
        pdf.setTextColor(DARK[0], DARK[1], DARK[2]);
        pdf.text(formatPrice(subtotal), startXRight, y, { align: 'right' });

        y += 4.5;
        pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
        pdf.text(`VAT - Kenya (16% on ${formatPrice(subtotal)})`, startXLeft, y);
        pdf.setTextColor(DARK[0], DARK[1], DARK[2]);
        pdf.text(formatPrice(vatAmount), startXRight, y, { align: 'right' });

        y += 3;
        pdf.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
        pdf.line(startXLeft, y, startXRight, y);

        y += 5;
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(DARK[0], DARK[1], DARK[2]);
        pdf.text('Total', startXLeft, y);
        pdf.text(formatPrice(totalPaid), startXRight, y, { align: 'right' });

        y += 4.5;
        pdf.text('Amount paid', startXLeft, y);
        pdf.text(formatPrice(totalPaid), startXRight, y, { align: 'right' });

        // --- PAYMENT HISTORY TABLE ---
        y += 12;
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(DARK[0], DARK[1], DARK[2]);
        pdf.text('Payment history', 15, y);

        y += 4;
        pdf.setDrawColor(DARK[0], DARK[1], DARK[2]);
        pdf.setLineWidth(0.4);
        pdf.line(15, y, 195, y);

        y += 5;
        pdf.setFontSize(7.5);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
        pdf.text('PAYMENT METHOD', 18, y);
        pdf.text('DATE', 70, y);
        pdf.text('AMOUNT PAID', 140, y, { align: 'right' });
        pdf.text('RECEIPT NUMBER', 192, y, { align: 'right' });

        y += 6;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8.5);
        pdf.setTextColor(DARK[0], DARK[1], DARK[2]);
        pdf.text(paymentMethodStr, 18, y);
        pdf.text(datePaidStr, 70, y);
        pdf.text(formatPrice(totalPaid), 140, y, { align: 'right' });
        pdf.text(receiptNum, 192, y, { align: 'right' });

        y += 4;
        pdf.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
        pdf.setLineWidth(0.3);
        pdf.line(15, y, 195, y);

        // --- FOOTER ---
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
        pdf.text('Page 1 of 1', 192, 282, { align: 'right' });

        const refCode = receiptNum.replace(/[^a-zA-Z0-9]/g, '_');
        pdf.save(`UQlearn_Receipt_${refCode}.pdf`);
      }
    } catch (err: any) {
      console.error('Error generating PDF receipt:', err);
      alert('Failed to generate PDF receipt. Please try again.');
    } finally {
      setDownloadingPDF(false);
    }
  };

  if (!currentUser) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Refresh Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            Payment History
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Review your past transactions, receipts, and course subscriptions.
          </p>
        </div>

        <button
          onClick={() => fetchHistory(true)}
          disabled={loading || refreshing}
          className="inline-flex items-center space-x-2 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer self-start sm:self-auto disabled:opacity-50"
          title="Refresh subscriptions"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-teal-600' : ''}`} />
          <span>{refreshing ? 'Syncing...' : 'Refresh Records'}</span>
        </button>
      </div>

      {/* Search Bar */}
      {subscriptions.filter(s => s.status === 'active').length > 0 && (
        <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transaction code or course title..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-teal-500 transition-colors"
            />
          </div>
        </div>
      )}

      {/* Main Table / Loader / Empty State */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500 font-medium">Fetching payment records from subscriptions table...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-rose-500" />
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Unable to load history</h3>
            <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{error}</p>
          </div>
        </div>
      ) : subscriptions.length === 0 ? (
        <DataNotFound
          title="No Payment History Found"
          message="You haven't made any course purchases or payment transactions yet."
          icon={Receipt}
        />
      ) : filteredSubscriptions.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-3">
          <Search className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            No transactions match "{searchQuery}"
          </p>
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
          >
            Clear Search Filters
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="px-5 py-4 font-semibold">Enrollment Date</th>
                  <th className="px-5 py-4 font-semibold">Item / Course</th>
                  <th className="px-5 py-4 font-semibold">Price</th>
                  <th className="px-5 py-4 font-semibold">Payment Method</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Transaction Code / Ref</th>
                  <th className="px-5 py-4 font-semibold text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {filteredSubscriptions.map((sub) => {
                  const dateStr = sub.enrolledAt 
                    ? new Date(sub.enrolledAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'N/A';

                  return (
                    <tr 
                      key={sub.id} 
                      onClick={() => setSelectedSub(sub)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      <td className="px-5 py-4 text-xs font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {dateStr}
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors line-clamp-1">
                          {sub.courseTitle}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-black text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {formatPrice(sub.coursePrice)}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-[11px] font-bold uppercase tracking-wider">
                          {sub.paymentMethod || 'payhero_stk'}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {sub.status === 'active' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          ) : sub.status === 'rejected' ? (
                            <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                          ) : (
                            <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                          )}
                          <span className={`text-xs font-bold ${
                            sub.status === 'active' ? 'text-emerald-600 dark:text-emerald-400' :
                            sub.status === 'rejected' ? 'text-rose-600 dark:text-rose-400' :
                            'text-amber-600 dark:text-amber-400'
                          }`}>
                            {sub.status ? sub.status.charAt(0).toUpperCase() + sub.status.slice(1) : 'Pending'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {sub.transactionCode || 'N/A'}
                      </td>
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSub(sub);
                          }}
                          className="px-3 py-1.5 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/60 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detailed Receipt Modal */}
      {selectedSub && (() => {
        const totalPaid = selectedSub.coursePrice || 0;
        const subtotal = totalPaid / 1.16;
        const vatAmount = totalPaid - subtotal;
        const datePaidStr = selectedSub.enrolledAt 
          ? new Date(selectedSub.enrolledAt).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })
          : new Date().toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            });

        const invoiceNum = `INV-${(selectedSub.id || '').replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase() || '7B9OLT66-0001'}`;
        const receiptNum = selectedSub.transactionCode || `2829-${(selectedSub.id || '').replace(/[^0-9]/g, '').slice(-8) || '3809-8276'}`;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn overflow-y-auto">
            <div className="bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] my-auto">
              
              {/* Floating Sticky Top Action Header */}
              <div className="sticky top-0 z-30 flex items-center justify-between bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/60 flex items-center justify-center">
                    <Receipt className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black tracking-wider uppercase text-slate-900 dark:text-slate-100">Payment Receipt</h3>
                    <p className="text-[10px] text-slate-500 font-mono">{receiptNum}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2.5">
                  <button
                    onClick={handleDownloadPDF}
                    disabled={downloadingPDF}
                    className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-1.5 cursor-pointer transform active:scale-95"
                  >
                    {downloadingPDF ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Generating PDF...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>Download PDF</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setSelectedSub(null)}
                    className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors cursor-pointer"
                    title="Close preview"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Scrollable Receipt Preview Box (Compact Preview Scale) */}
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex justify-center bg-slate-200/50 dark:bg-slate-950/60">
                {/* Printable PDF Receipt Container */}
                <div 
                  ref={receiptRef} 
                  data-receipt-container="true"
                  className="bg-white text-slate-900 p-6 sm:p-7 rounded-xl border border-slate-200 shadow-md space-y-6 font-sans text-[11px] leading-relaxed w-full max-w-[580px] shrink-0"
                >
                  {/* Header: Centered Logo + Brand Text below it + Receipt Title */}
                  <div className="flex flex-col items-center justify-center border-b border-slate-200 pb-3 text-center">
                    <div className="flex flex-col items-center justify-center space-y-1 mb-1">
                      <img
                        src={resolveBrandingLogoUrl(logoUrl)}
                        alt="UQlearn Logo"
                        className="w-14 h-14 object-contain mx-auto"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/logo/logo.png';
                        }}
                      />
                      <span className="text-lg font-black tracking-tight select-none">
                        <span className="text-teal-600">UQ</span>
                        <span className="text-purple-600">learn</span>
                      </span>
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 mt-1">Receipt</h1>
                  </div>

                  {/* Invoice Meta & Address info grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-[11px]">
                    {/* Left Column: Receipt Meta & Company Details */}
                    <div className="space-y-3">
                      <div className="space-y-0.5 text-slate-800">
                        <div className="flex"><span className="w-28 text-slate-500">Invoice number</span><span className="font-semibold">{invoiceNum}</span></div>
                        <div className="flex"><span className="w-28 text-slate-500">Receipt number</span><span className="font-semibold">{receiptNum}</span></div>
                        <div className="flex"><span className="w-28 text-slate-500">Date paid</span><span className="font-semibold">{datePaidStr}</span></div>
                        <div className="flex"><span className="w-28 text-slate-500">VAT Registration</span><span className="font-semibold">Kenya VAT: P052579113H</span></div>
                      </div>

                      <div className="pt-1 text-slate-700 space-y-0.5 text-[10px]">
                        <p className="font-bold text-slate-900 text-[11px]">UQlearn Limited</p>
                        <p>Mashauri Road, GHUDKA Building</p>
                        <p>Kisii Central District, Kisii County</p>
                        <p>40200, Kenya</p>
                        <p className="text-slate-500">support@uqlearn.org</p>
                      </div>
                    </div>

                    {/* Right Column: Bill To details (Name and Email ONLY as requested) */}
                    <div className="space-y-0.5 text-slate-700 sm:text-left">
                      <p className="font-bold text-slate-900 text-[11px] mb-1">Bill to</p>
                      <p className="font-semibold text-slate-900">{currentUser.name || currentUser.fullName || 'mike kenyanya'}</p>
                      <p className="text-slate-500">{currentUser.email}</p>
                    </div>
                  </div>

                  {/* Paid Amount Highlight Statement */}
                  <div className="pt-1">
                    <p className="text-lg font-bold text-slate-900">
                      {formatPrice(totalPaid)} paid on {datePaidStr}
                    </p>
                  </div>

                  {/* Line Items Table */}
                  <div className="space-y-2">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-900 text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                          <th className="py-2 pr-3">Description</th>
                          <th className="py-2 px-2 text-center w-10">Qty</th>
                          <th className="py-2 px-2 text-right">Unit price</th>
                          <th className="py-2 px-2 text-right">Tax</th>
                          <th className="py-2 pl-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px]">
                        <tr>
                          <td className="py-2.5 pr-3">
                            <p className="font-semibold text-slate-900">{selectedSub.courseTitle || 'Course Access & Certification'}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">{datePaidStr} – Lifetime Access</p>
                          </td>
                          <td className="py-2.5 px-2 text-center text-slate-800 font-medium">1</td>
                          <td className="py-2.5 px-2 text-right text-slate-800">{formatPrice(subtotal)}</td>
                          <td className="py-2.5 px-2 text-right text-slate-800">16%</td>
                          <td className="py-2.5 pl-2 text-right font-medium text-slate-900">{formatPrice(subtotal)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Subtotals & Taxes breakdown (Right aligned) */}
                  <div className="flex justify-end pt-1">
                    <div className="w-full max-w-[240px] space-y-1 text-[11px] text-slate-700 border-t border-slate-100 pt-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Subtotal</span>
                        <span className="font-medium text-slate-900">{formatPrice(subtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Total excluding tax</span>
                        <span className="font-medium text-slate-900">{formatPrice(subtotal)}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-500">VAT - Kenya (16% on {formatPrice(subtotal)})</span>
                        <span className="font-medium text-slate-900">{formatPrice(vatAmount)}</span>
                      </div>
                      <div className="flex justify-between pt-0.5">
                        <span className="font-bold text-slate-900">Total</span>
                        <span className="font-bold text-slate-900">{formatPrice(totalPaid)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-bold text-slate-900">Amount paid</span>
                        <span className="font-bold text-slate-900">{formatPrice(totalPaid)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment History Section */}
                  <div className="pt-4 space-y-2 border-t border-slate-200">
                    <h2 className="text-xs font-bold text-slate-900">Payment history</h2>
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-900 text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                          <th className="py-1.5 pr-3">Payment method</th>
                          <th className="py-1.5 px-2">Date</th>
                          <th className="py-1.5 px-2 text-right">Amount paid</th>
                          <th className="py-1.5 pl-2 text-right">Receipt number</th>
                        </tr>
                      </thead>
                      <tbody className="text-[11px]">
                        <tr>
                          <td className="py-2 pr-3 font-medium text-slate-800">
                            {selectedSub.paymentMethod ? selectedSub.paymentMethod.toUpperCase() : 'M-PESA / VISA'}
                          </td>
                          <td className="py-2 px-2 text-slate-700">{datePaidStr}</td>
                          <td className="py-2 px-2 text-right font-medium text-slate-900">{formatPrice(totalPaid)}</td>
                          <td className="py-2 pl-2 text-right font-mono text-slate-700">{receiptNum}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Footer */}
                  <div className="pt-4 flex justify-end text-[10px] text-slate-400 font-medium">
                    <span>Page 1 of 1</span>
                  </div>

                </div>
              </div>

              {/* Floating Bottom Action Dock for Mobile/Small Screens */}
              <div className="sticky bottom-0 z-30 sm:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Total: {formatPrice(totalPaid)}</span>
                <button
                  onClick={handleDownloadPDF}
                  disabled={downloadingPDF}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
};


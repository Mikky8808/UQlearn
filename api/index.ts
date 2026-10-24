import { Router, Request, Response } from 'express';
import coursesRouter from './routes/courses';
import quizzesRouter from './routes/quizzes';
import aiRouter from './routes/ai';
import analyticsRouter from './routes/analytics';
import purchasesRouter from './routes/purchases';
import messagesRouter from './routes/messages';
import uploadRouter from './routes/upload';
import mediaUploadRouter from './routes/media-upload';
import resumableRouter from './routes/upload-resumable';
import logoRouter from './routes/logo';
import v1Router from './v1';

const apiRouter = Router();

// Health check endpoint
apiRouter.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'UQlearn API Engine',
    version: '1.0.0'
  });
});

// Upload routes (mounting both extensionless and .php endpoints for 100% compatibility)
apiRouter.use(['/upload', '/upload.php', '/v1/upload', '/v1/upload.php'], uploadRouter);
apiRouter.use(['/media-upload', '/media-upload.php', '/v1/media-upload', '/v1/media-upload.php'], mediaUploadRouter);
apiRouter.use(['/upload-resumable', '/upload-resumable.php', '/v1/upload-resumable', '/v1/upload-resumable.php'], resumableRouter);

// Other API routes
apiRouter.use(['/logo', '/logo.php', '/v1/logo', '/v1/logo.php'], logoRouter);

apiRouter.use(['/courses', '/courses.php', '/v1/courses', '/v1/courses.php'], coursesRouter);

apiRouter.use(['/quizzes', '/quizzes.php', '/v1/quizzes', '/v1/quizzes.php'], quizzesRouter);

apiRouter.use(['/analytics', '/analytics.php', '/v1/analytics', '/v1/analytics.php'], analyticsRouter);

apiRouter.use(['/purchases', '/purchases.php', '/v1/purchases', '/v1/purchases.php'], purchasesRouter);

apiRouter.use(['/messages', '/messages.php', '/instructor-messages.php', '/v1/messages', '/v1/messages.php', '/v1/instructor-messages.php'], messagesRouter);

apiRouter.use(['/ai', '/ai.php', '/v1/ai', '/v1/ai.php'], aiRouter);

// Local in-memory store for digital signatures
const devSignaturesStore: Record<string, string> = {};

// Local in-memory store for recently viewed courses in dev environment
const devRecentlyViewedStore: Record<string, string[]> = {};

apiRouter.all(['/recently-viewed.php', '/recently-viewed', '/v1/recently-viewed.php', '/v1/recently-viewed'], (req: Request, res: Response) => {
  const method = req.method.toUpperCase();
  const userId = (req.query.userId || req.query.user_id || req.body?.userId || req.body?.user_id || 'guest').toString().trim() || 'guest';
  
  if (!devRecentlyViewedStore[userId]) {
    devRecentlyViewedStore[userId] = [];
  }

  if (method === 'GET') {
    return res.json({
      success: true,
      user_id: userId,
      items: devRecentlyViewedStore[userId] || [],
      data: (devRecentlyViewedStore[userId] || []).map(cid => ({
        course_id: cid,
        viewed_at: new Date().toISOString()
      }))
    });
  }

  if (method === 'POST') {
    const action = req.body?.action || 'record';
    const courseId = (req.body?.courseId || req.body?.course_id || '').toString().trim();

    if (action === 'clear') {
      devRecentlyViewedStore[userId] = [];
      return res.json({ success: true, message: 'Cleared recently viewed' });
    }

    if (action === 'remove') {
      if (courseId) {
        devRecentlyViewedStore[userId] = devRecentlyViewedStore[userId].filter(id => id !== courseId);
      }
      return res.json({ success: true, message: 'Removed' });
    }

    if (courseId) {
      devRecentlyViewedStore[userId] = [courseId, ...devRecentlyViewedStore[userId].filter(id => id !== courseId)].slice(0, 20);
    }

    return res.json({
      success: true,
      message: 'Recorded',
      course_id: courseId,
      items: devRecentlyViewedStore[userId]
    });
  }

  if (method === 'DELETE') {
    const courseId = (req.query.courseId || req.query.course_id || '').toString().trim();
    if (courseId) {
      devRecentlyViewedStore[userId] = devRecentlyViewedStore[userId].filter(id => id !== courseId);
    }
    return res.json({ success: true, message: 'Deleted' });
  }

  return res.json({ success: true });
});

// Allowed 7 currencies in exact order (NGN, GHS, KES, ZMW, USD, ZAR, XAF)
const ALLOWED_PLATFORM_CURRENCIES = [
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', exchange_rate: 1400.0, is_default: 0 },
  { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi', exchange_rate: 15.5, is_default: 0 },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', exchange_rate: 130.0, is_default: 1 },
  { code: 'ZMW', symbol: 'ZK', name: 'Zambian Kwacha', exchange_rate: 26.0, is_default: 0 },
  { code: 'USD', symbol: '$', name: 'US Dollar', exchange_rate: 1.0, is_default: 0 },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', exchange_rate: 18.5, is_default: 0 },
  { code: 'XAF', symbol: 'FCFA', name: 'Central African CFA Franc', exchange_rate: 600.0, is_default: 0 },
  { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling', exchange_rate: 3700.0, is_default: 0 },
];

const devUserCurrencyPreferences: Record<string, string> = {};

apiRouter.all(['/currencies.php', '/currencies', '/v1/currencies.php', '/v1/currencies'], (req: Request, res: Response) => {
  const method = req.method.toUpperCase();
  const userId = (req.query.userId || req.query.user_id || req.body?.userId || req.body?.user_id || 'current-user').toString();

  if (method === 'GET') {
    const preference = devUserCurrencyPreferences[userId] || 'KES';
    return res.json({
      success: true,
      preference,
      currencies: ALLOWED_PLATFORM_CURRENCIES
    });
  }

  if (method === 'POST') {
    const currencyCode = (req.body?.currency_code || req.body?.currencyCode || 'KES').toString();
    devUserCurrencyPreferences[userId] = currencyCode;
    return res.json({
      success: true,
      message: `System currency preference updated successfully to ${currencyCode}`,
      currency_code: currencyCode
    });
  }

  return res.json({ success: true, currencies: ALLOWED_PLATFORM_CURRENCIES });
});

// Flash Sale & Top Selling Shelf Configuration Endpoint
let devFlashSaleConfig = {
  enabled: true,
  title: 'Top selling items',
  startTime: '2026-10-24T00:00',
  endTime: '2027-08-23T23:59:59',
  courseIds: [] as string[]
};

apiRouter.all(['/flash-sale.php', '/flash-sale', '/v1/flash-sale.php', '/v1/flash-sale'], (req: Request, res: Response) => {
  if (req.method === 'GET') {
    return res.json({
      success: true,
      config: devFlashSaleConfig,
      data: devFlashSaleConfig
    });
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    devFlashSaleConfig = {
      enabled: body.enabled !== false,
      title: body.title || devFlashSaleConfig.title,
      startTime: body.startTime || devFlashSaleConfig.startTime,
      endTime: body.endTime || devFlashSaleConfig.endTime,
      courseIds: Array.isArray(body.courseIds) ? body.courseIds : devFlashSaleConfig.courseIds
    };
    return res.json({
      success: true,
      message: 'Flash sale configuration saved successfully',
      config: devFlashSaleConfig,
      data: devFlashSaleConfig
    });
  }

  return res.json({ success: true, config: devFlashSaleConfig });
});

// Digital signatures endpoint (matches /api/v1/signatures.php)
apiRouter.all(['/signatures.php', '/signatures', '/v1/signatures.php', '/v1/signatures'], (req: Request, res: Response) => {
  if (req.method === 'GET') {
    const userId = (req.query.userId || req.query.user_id || req.query.id || '').toString();
    return res.json({
      success: true,
      signatureData: devSignaturesStore[userId] || null
    });
  }
  if (req.method === 'POST') {
    const userId = (req.body?.userId || req.body?.user_id || '').toString();
    const signatureData = (req.body?.signatureData || req.body?.signature || '').toString();
    if (userId && signatureData) {
      devSignaturesStore[userId] = signatureData;
    }
    return res.json({
      success: true,
      message: 'Signature saved successfully',
      userId
    });
  }
  return res.json({ success: true });
});

// v2 Endpoint: Instructor Details
apiRouter.all(['/v2/instructor-details.php', '/v2/instructor-details', '/instructor-details.php'], (req: Request, res: Response) => {
  const courseId = (req.query.course_id || req.query.courseId || req.body?.course_id || req.body?.courseId || '').toString().trim();
  
  if (!courseId) {
    return res.status(400).json({
      success: false,
      message: 'Missing required parameter: course_id'
    });
  }

  const instructorDetails = {
    instructorId: 'mike_kenyanya',
    name: 'mike kenyanya',
    headline: 'Canva Mastery Instructor',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    rating: 5.0,
    reviews: 112250,
    students: 603607,
    coursesCount: 17,
    bio: "There's no greater joy than watching beautiful testimonials of people achieving their goals and dreams. That's why we STRONGLY believe in full and constant support. With ALL of our courses you can expect:"
  };

  return res.json({
    success: true,
    course_id: courseId,
    data: instructorDetails,
    instructor: instructorDetails
  });
});

// Paystack Callback & Redirect Verification Endpoint
apiRouter.all(['/paystack-callback', '/paystack-callback.php', '/v1/paystack-callback', '/v1/paystack-callback.php'], async (req: Request, res: Response) => {
  const reference = (req.query.reference || req.query.trxref || req.body?.reference || req.body?.trxref || '').toString().trim();
  const secretKey = process.env.PAYSTACK_SECRET_KEY || 'sk_live_f57fdd97f82425508e6542e9b59c9bdce105caa0';

  let isVerified = false;
  let amount = 0;
  let currency = 'KES';
  let customerEmail = '';
  let verificationMessage = '';

  if (reference) {
    try {
      const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      const data = await response.json();
      if (response.ok && data.status && data.data?.status === 'success') {
        isVerified = true;
        amount = (data.data.amount || 0) / 100;
        currency = data.data.currency || 'KES';
        customerEmail = data.data.customer?.email || '';
        verificationMessage = data.data.gateway_response || 'Payment verified successfully';
      } else {
        verificationMessage = data.message || 'Verification failed';
      }
    } catch (e: any) {
      verificationMessage = e?.message || 'Error connecting to Paystack';
    }
  } else {
    verificationMessage = 'No reference provided';
  }

  const queryParams = new URLSearchParams({
    tab: 'learning',
    payment: isVerified ? 'success' : 'failed',
    ref: reference,
    status: isVerified ? 'confirmed' : 'unconfirmed',
    provider: 'paystack',
    currency,
    amount: amount.toFixed(2),
    ...(isVerified ? {} : { msg: verificationMessage })
  });

  const dashboardUrl = `/dashboard?${queryParams.toString()}`;

  const acceptsJson = req.query.format === 'json' || req.headers.accept?.includes('application/json');
  if (acceptsJson) {
    return res.json({
      success: isVerified,
      verified: isVerified,
      status: isVerified ? 'confirmed' : 'unconfirmed',
      message: isVerified ? 'Payment confirmed successfully.' : verificationMessage,
      reference,
      amount,
      currency,
      customerEmail,
      redirect_url: dashboardUrl
    });
  }

  return res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isVerified ? 'Payment Confirmed - UQlearn' : 'Payment Status - UQlearn'}</title>
  <meta http-equiv="refresh" content="2;url=${dashboardUrl}">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { background: #090d16; color: #f8fafc; font-family: 'Plus Jakarta Sans', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 24px; }
    .card { background: rgba(15, 23, 42, 0.9); border: 1px solid ${isVerified ? 'rgba(20, 184, 166, 0.4)' : 'rgba(239, 68, 68, 0.4)'}; border-radius: 28px; max-width: 480px; width: 100%; padding: 40px 32px; text-align: center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.7); }
    .icon { width: 72px; height: 72px; border-radius: 20px; background: ${isVerified ? 'rgba(13, 148, 136, 0.2)' : 'rgba(239, 68, 68, 0.2)'}; color: ${isVerified ? '#14b8a6' : '#ef4444'}; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 32px; font-weight: bold; }
    h1 { font-size: 24px; font-weight: 800; margin-bottom: 8px; }
    p { color: #94a3b8; font-size: 14px; margin-bottom: 24px; line-height: 1.5; }
    .details { background: rgba(30, 41, 59, 0.6); border-radius: 16px; padding: 16px; margin-bottom: 24px; text-align: left; font-size: 13px; }
    .row { display: flex; justify-content: space-between; padding: 6px 0; color: #cbd5e1; }
    .btn { display: inline-block; width: 100%; padding: 14px; background: #0d9488; color: white; text-decoration: none; font-weight: 700; border-radius: 14px; font-size: 14px; box-sizing: border-box; }
    .btn:hover { background: #14b8a6; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${isVerified ? '✓' : '⚠'}</div>
    <h1>${isVerified ? 'Payment Confirmed!' : 'Verification Notice'}</h1>
    <p>${isVerified ? 'Thank you! Your payment has been verified. Redirecting you to your learning dashboard...' : verificationMessage}</p>
    <div class="details">
      <div class="row"><span>Reference:</span><strong style="font-family:monospace">${reference || 'N/A'}</strong></div>
      ${amount > 0 ? `<div class="row"><span>Amount:</span><strong>${currency} ${amount.toFixed(2)}</strong></div>` : ''}
      <div class="row"><span>Status:</span><strong style="color:${isVerified ? '#2dd4bf' : '#f87171'}">${isVerified ? 'CONFIRMED' : 'UNCONFIRMED'}</strong></div>
    </div>
    <a href="${dashboardUrl}" class="btn">Proceed to Learning Dashboard →</a>
  </div>
  <script>setTimeout(function(){ window.location.replace('${dashboardUrl}'); }, 2000);</script>
</body>
</html>`);
});

// Base v1 router fallback for legacy script endpoints
apiRouter.use('/', v1Router);
apiRouter.use('/v1', v1Router);

export default apiRouter;

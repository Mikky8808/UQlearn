import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { createProxyMiddleware, fixRequestBody } from "http-proxy-middleware";
// REMOVED: import apiRouter from "./api";

dotenv.config();

const app = express();
const PORT = 3000;

// Ensure public/uploads directories exist
const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
const coursesUploadsDir = path.join(uploadsDir, 'courses');
const avatarsUploadsDir = path.join(uploadsDir, 'avatars');
if (!fs.existsSync(coursesUploadsDir)) fs.mkdirSync(coursesUploadsDir, { recursive: true });
if (!fs.existsSync(avatarsUploadsDir)) fs.mkdirSync(avatarsUploadsDir, { recursive: true });

// CORS Middleware for resumable uploads and API requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Sync-Key, X-Deploy-Key, Accept, Origin, Content-Range, Range, X-Upload-Id, X-File-Name, X-File-Size, X-Folder');
  res.header('Access-Control-Expose-Headers', 'Content-Range, Range, Location, X-Upload-Id, Content-Length');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Body parsing middleware
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Explicitly serve uploads folder
app.use('/uploads', express.static(uploadsDir));

// Proxy API requests to remote backend to avoid CORS and timeout issues in AI Studio
const remoteProxy = createProxyMiddleware({
  target: 'https://uqlearn.org',
  changeOrigin: true,
  pathRewrite: {
    '^/api/proxy': '/api',
    '^/api/v1': '/api',
    '^/api/v2': '/api',
    '^/api': '/api',
  },
  timeout: 25000,
  proxyTimeout: 25000,
  on: {
    proxyReq: (proxyReq, req: any) => {
      const contentType = req.headers['content-type'] || '';
      if (contentType.includes('application/json') || contentType.includes('application/x-www-form-urlencoded')) {
        return fixRequestBody(proxyReq, req);
      }
    },
    proxyRes: (proxyRes, req, res) => {
      delete proxyRes.headers['access-control-allow-origin'];
      delete (proxyRes.headers as any)['Access-Control-Allow-Origin'];
      proxyRes.headers['access-control-allow-origin'] = '*';
      proxyRes.headers['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH';
      proxyRes.headers['access-control-allow-headers'] = 'Content-Type, Authorization, X-Requested-With, X-User-Id, Accept, Origin, Content-Range, Range, X-Upload-Id, X-User-Email, X-File-Name, X-File-Size, X-Folder, X-Sync-Key, X-Deploy-Key';
    },
    error: (err, req, res) => {
      console.warn(`[Remote Proxy Error] ${req.url}:`, (err as any)?.message || err);
      if (!res.headersSent) {
        (res as any).status(502).json({
          success: false,
          error: (err as any)?.message || 'Proxy Error',
          message: 'Remote server temporarily unreachable'
        });
      }
    }
  }
} as any);

const rewriteLegacyApiEndpoint = (url: string): string => {
  return url
    .replace(/^\/study-plan\.php\b/, '/study-planner.php')
    .replace(/^\/onboarding\.php\b/, '/instructor-onboarding.php')
    .replace(/^\/modules\.php\b/, '/course-modules.php')
    .replace(/^\/messages\.php\b/, '/instructor-messages.php')
    .replace(/^\/reviewer-assignments\.php\b/, '/reviewers.php')
    .replace(/^\/checklist\.php\b/, '/intended-learners.php')
    .replace(/^\/instructor-details\.php\b/, '/profile.php')
    .replace(/^\/sponsored-pricing-plans\.php\b/, '/sponsored_ads.php?action=plans')
    .replace(/^\/custom-mail-pricing\.php\b/, '/custom-mail.php?action=pricing')
    .replace(/^\/custom-mail-subscriptions\.php\b/, '/custom-mail.php?action=subscriptions');
};

// Simplified handler: Routes everything to the remote proxy
const handleApiRequest = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  req.url = rewriteLegacyApiEndpoint(req.url || '');
  return remoteProxy(req, res, next);
};

app.use('/api', handleApiRequest);
// REMOVED: app.use("/api", apiRouter);

async function startServer() {
  // Vite middleware for development or static serving in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    
    // Serve static files without automatic index.html serving to handle SPA fallback
    app.use(express.static(distPath, { index: false }));

    // Fallback to the main index.html for all requests
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`UQlearn backend server running on http://localhost:${PORT}`);
  });
}

startServer();
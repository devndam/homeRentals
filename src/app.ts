import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { errorHandler } from './middleware/error-handler';
import { swaggerDocument } from './config/swagger';

// Route imports
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/users/user.routes';
import propertyRoutes from './modules/properties/property.routes';
import bookingRoutes from './modules/bookings/booking.routes';
import agreementRoutes from './modules/agreements/agreement.routes';
import paymentRoutes from './modules/payments/payment.routes';
import adminRoutes from './modules/admin/admin.routes';
import agentRoutes from './modules/agents/agent.routes';

const app = express();

// ─── Security ────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: env.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Rate Limiting ───────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later' },
});
app.use(`${env.apiPrefix}/`, limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many authentication attempts' },
});
app.use(`${env.apiPrefix}/auth/`, authLimiter);

// ─── Body Parsing ────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Compression & Logging ──────────────────
app.use(compression());
if (env.isDev) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ─── Static files (uploads) ─────────────────
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ─── Swagger Docs ───────────────────────────
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customSiteTitle: 'Rentals NG API Docs',
  customCss: '.swagger-ui .topbar { display: none }',
}));
app.get('/docs.json', (_req, res) => {
  res.json(swaggerDocument);
});

// ─── Health Check ────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API Routes ──────────────────────────────
app.use(`${env.apiPrefix}/auth`, authRoutes);
app.use(`${env.apiPrefix}/users`, userRoutes);
app.use(`${env.apiPrefix}/properties`, propertyRoutes);
app.use(`${env.apiPrefix}/bookings`, bookingRoutes);
app.use(`${env.apiPrefix}/agreements`, agreementRoutes);
app.use(`${env.apiPrefix}/payments`, paymentRoutes);
app.use(`${env.apiPrefix}/admin`, adminRoutes);
app.use(`${env.apiPrefix}/agents`, agentRoutes);

// ─── 404 ─────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Error Handler ───────────────────────────
app.use(errorHandler);

export default app;

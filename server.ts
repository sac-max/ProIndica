import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';
import type Stripe from 'stripe';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lazy initialization helpers
let _db: any;
let _stripe: any;

async function getFirestoreDb() {
  if (_db) return _db;
  const { initializeApp } = await import('firebase/app');
  const { getFirestore } = await import('firebase/firestore');
  
  const firebaseConfigPath = path.join(__dirname, 'firebase-applet-config.json');
  if (!fs.existsSync(firebaseConfigPath)) {
    throw new Error('firebase-applet-config.json not found');
  }
  const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
  const appFirebase = initializeApp(firebaseConfig);
  _db = getFirestore(appFirebase, firebaseConfig.firestoreDatabaseId);
  return _db;
}

async function getStripe() {
  if (_stripe) return _stripe;
  const StripeModule = await import('stripe');
  const StripeClass = StripeModule.default;
  _stripe = new StripeClass(process.env.STRIPE_SECRET_KEY || '');
  return _stripe;
}

async function startServer() {
  const app = express();
  const isProduction = process.env.NODE_ENV === 'production';
  const PORT = 3000;
  const DEPLOY_TIME = '2026-04-18T22:06:00Z';

  console.log(`[DIAGNOSTIC] Starting server - node: ${process.version}, env: ${process.env.NODE_ENV}, version: ${DEPLOY_TIME}`);

  // Health check for probes - MUST be extremely fast
  app.get('/api/health', (req, res) => res.status(200).send('OK'));
  app.get('/healthz', (req, res) => res.status(200).send('OK'));
  app.get('/api/version', (req, res) => res.json({ version: DEPLOY_TIME, env: process.env.NODE_ENV }));

  // Request logging - Filtered
  app.use((req, res, next) => {
    if (req.url.startsWith('/api') || req.url.startsWith('/health')) {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    }
    next();
  });

  app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const stripe = await getStripe();
    const db = await getFirestoreDb();
    const { writeBatch, doc, serverTimestamp } = await import('firebase/firestore');
    
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
      if (!sig || !webhookSecret) {
        console.warn('Webhook warning: Missing signature or webhook secret. If you are testing locally/preview, ensure STRIPE_WEBHOOK_SECRET is set.');
        throw new Error('Missing signature or webhook secret');
      }
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      console.error(`Webhook Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;

      if (userId) {
        console.log(`Updating user ${userId} to premium and recording payment...`);
        try {
          const batch = writeBatch(db);

          // Update professionals collection
          const profRef = doc(db, 'professionals', userId);
          batch.set(profRef, {
            isPremium: true,
            premiumSince: serverTimestamp()
          }, { merge: true });
          
          // Update users collection
          const userRef = doc(db, 'users', userId);
          batch.set(userRef, {
            isPremium: true
          }, { merge: true });

          // Record payment
          const paymentRef = doc(db, 'payments', session.id);
          batch.set(paymentRef, {
            userId: userId,
            userEmail: session.customer_details?.email || session.customer_email || '',
            amount: (session.amount_total || 0) / 100, // Convert from cents
            currency: session.currency || 'brl',
            stripeSessionId: session.id,
            timestamp: serverTimestamp()
          });
          
          await batch.commit();
          console.log(`User ${userId} is now premium and payment recorded.`);
        } catch (error) {
          console.error('Error updating user status and recording payment:', error);
        }
      }
    }

    res.json({ received: true });
  });

  // Request logging - Filtered to only show API and health requests to reduce noise
  app.use((req, res, next) => {
    const isApiRequest = req.url.startsWith('/api') || req.url.startsWith('/health');
    if (isApiRequest) {
      console.log(`[DIAGNOSTIC] Request: ${req.method} ${req.url} (from ${req.ip})`);
    }
    next();
  });

  app.use('/api', express.json());

  app.get('/api/sync-payments', async (req, res) => {
    try {
      const stripe = await getStripe();
      const db = await getFirestoreDb();
      const { writeBatch, doc, getDoc, serverTimestamp } = await import('firebase/firestore');
      
      // Fetch last 20 successful checkout sessions
      const sessions = await stripe.checkout.sessions.list({
        limit: 20,
        status: 'complete'
      });

      let syncedCount = 0;
      const batch = writeBatch(db);

      for (const session of sessions.data) {
        const userId = session.metadata?.userId;
        if (!userId) continue;

        // Check if payment already exists in Firestore
        const paymentDoc = await getDoc(doc(db, 'payments', session.id));
        if (!paymentDoc.exists()) {
          console.log(`Syncing missed payment for session ${session.id}...`);
          
          const paymentRef = doc(db, 'payments', session.id);
          batch.set(paymentRef, {
            userId: userId,
            userEmail: session.customer_details?.email || session.customer_email || '',
            amount: (session.amount_total || 0) / 100,
            currency: session.currency || 'brl',
            stripeSessionId: session.id,
            timestamp: serverTimestamp(),
            syncedAt: serverTimestamp()
          });

          // Also ensure user is premium
          const profRef = doc(db, 'professionals', userId);
          batch.set(profRef, { isPremium: true }, { merge: true });
          
          const userRef = doc(db, 'users', userId);
          batch.set(userRef, { isPremium: true }, { merge: true });

          syncedCount++;
        }
      }

      if (syncedCount > 0) {
        await batch.commit();
      }

      res.json({ success: true, syncedCount });
    } catch (error: any) {
      console.error('Sync error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/create-checkout-session', async (req, res) => {
    const stripe = await getStripe();
    const { userId, userEmail } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    try {
      console.log(`Creating Stripe session for user ${userId} (${userEmail || 'no email'})...`);
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'brl',
              product_data: {
                name: 'Assinatura Premium - Pro Indica',
                description: 'Acesso total a recursos exclusivos para profissionais.',
              },
              unit_amount: 1000, // R$ 10,00 (75% discount from R$ 40,00)
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.VITE_APP_URL || 'http://localhost:3000'}/profile/${userId}?payment=success`,
        cancel_url: `${process.env.VITE_APP_URL || 'http://localhost:3000'}/premium?payment=cancel`,
        ...(userEmail ? { customer_email: userEmail } : {}),
        metadata: {
          userId: userId,
        },
      });
      console.log('Stripe session created:', session.id);

      res.json({ id: session.id, url: session.url });
    } catch (error: any) {
      console.error('Stripe error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (!isProduction) {
    console.log('Initializing Vite middleware...');
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('Serving static files from dist...');
    const distPath = path.join(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      console.warn('Warning: dist directory not found. Static files will not be served.');
    }
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[DIAGNOSTIC] Server listening on port ${PORT}`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[DIAGNOSTIC] Port ${PORT} is BUSY. Deployment might be overlapping. Exiting with 1.`);
      process.exit(1); 
    } else {
      console.error('[DIAGNOSTIC] Unexpected server error:', err);
      process.exit(1);
    }
  });

  process.on('SIGTERM', () => {
    server.close(() => process.exit(0));
  });
}

if (!(global as any)._serverStarted) {
  (global as any)._serverStarted = true;
  startServer().catch(err => {
    console.error('[DIAGNOSTIC] Fatal error:', err);
    process.exit(1);
  });
}

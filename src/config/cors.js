const allowedOrigins = new Set([
  'http://localhost:5173',
  'https://untitled-rho.vercel.app'
]);

export const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('CORS not allowed'));
  },
  methods: ['GET'],
  optionsSuccessStatus: 200
};

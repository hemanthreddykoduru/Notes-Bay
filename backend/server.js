const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes Placeholder
app.get('/', (req, res) => {
  res.send('NotesBay API is running...');
});

// Import Routes
const authRoutes = require('./routes/auth');
const noteRoutes = require('./routes/notes');
const paymentRoutes = require('./routes/payments');
const courseRoutes = require('./routes/courses');
const cryptoRoutes = require('./routes/crypto');
const adminRoutes = require('./routes/admin');
const supportRoutes = require('./routes/support');
const servicesRoutes = require('./routes/services');

app.use('/api/auth', authRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/crypto', cryptoRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/wishlist', require('./routes/wishlist'));
app.use('/api/config', require('./routes/config'));
app.use('/api/support', require('./routes/support'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/qa', require('./routes/qa'));

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Routes loaded: /api/auth, /api/notes, /api/courses, /api/payments, /api/reviews');
  });
}

module.exports = app;

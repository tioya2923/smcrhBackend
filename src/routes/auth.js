const router = require('express').Router();
const { login, register, me, forgotPassword, resetPassword, changePassword } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');

router.post('/login', authLimiter, login);
router.post('/register', authenticate, login); // Only admins create accounts - see admin routes
router.get('/me', authenticate, me);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);
router.put('/change-password', authenticate, changePassword);

module.exports = router;

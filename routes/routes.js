const express = require('express');
const router = express.Router();
const path = require('path');
const authController = require('../controller/authController');
const authenticate = require('../middlewares/authenticate');


router.get('/', authenticate, (req, res) => {
    return res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ✅ show index page on root ("/")
router.get('/sticker',authenticate, (req, res) => {
    return res.sendFile(path.join(__dirname, '..', 'public', 'sticker.html'));
});

router.get('/qr',authenticate, (req, res) => {
    return res.sendFile(path.join(__dirname, '..', 'public', 'qr.html'));
});

router.get('/shooter_sticker',authenticate, (req, res) => {
    return res.sendFile(path.join(__dirname, '..', 'public', 'shooter_sticker.html'));
});

// ✅ show login page at "/auth/login"
router.get('/login', (req, res) => {
    return res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});

router.post('/login', authController.login);

router.get('/logout', authController.logout);

module.exports = router;

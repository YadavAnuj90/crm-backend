let speakeasy = null;
let QRCode = null;
try { speakeasy = require('speakeasy'); } catch (e) { /* install speakeasy to enable 2FA */ }
try { QRCode = require('qrcode'); } catch (e) { /* install qrcode to enable 2FA */ }

const User = require('../models/user.model');

exports.setup2FA = async (req, res) => {
  if (!speakeasy || !QRCode) {
    return res.status(503).json({ message: '2FA not available. Run: npm install speakeasy qrcode' });
  }
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const secret = speakeasy.generateSecret({ name: `CRM (${user.email})`, length: 20 });
    user.twoFactorSecret = secret.base32;
    await user.save();

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
    res.status(200).json({
      message: '2FA setup initiated. Scan QR code with your authenticator app.',
      qrCode: qrCodeUrl,
      secret: secret.base32
    });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.verify2FA = async (req, res) => {
  if (!speakeasy) return res.status(503).json({ message: '2FA not available. Run: npm install speakeasy' });
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'OTP token is required' });

    const user = await User.findById(req.user.id);
    if (!user || !user.twoFactorSecret) return res.status(400).json({ message: '2FA not set up' });

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret, encoding: 'base32', token, window: 1
    });
    if (!verified) return res.status(400).json({ message: 'Invalid OTP token' });

    user.twoFactorEnabled = true;
    await user.save();
    res.status(200).json({ message: '2FA enabled successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.disable2FA = async (req, res) => {
  if (!speakeasy) return res.status(503).json({ message: '2FA not available. Run: npm install speakeasy' });
  try {
    const { token } = req.body;
    const user = await User.findById(req.user.id);
    if (!user || !user.twoFactorEnabled) return res.status(400).json({ message: '2FA is not enabled' });

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret, encoding: 'base32', token, window: 1
    });
    if (!verified) return res.status(400).json({ message: 'Invalid OTP token' });

    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    await user.save();
    res.status(200).json({ message: '2FA disabled successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

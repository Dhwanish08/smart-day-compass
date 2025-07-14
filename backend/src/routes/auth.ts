import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import { sendMail } from '../utils/mailer';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

// JWT authentication middleware
function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided.' });

  jwt.verify(token, process.env.JWT_SECRET || 'default_secret', (err, decoded: any) => {
    if (err) return res.status(403).json({ message: 'Invalid token.' });
    // Attach userId to request for use in routes
    (req as any).userId = decoded.userId;
    next();
  });
}

// Rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: { message: 'Too many attempts, please try again later.' }
});

// Registration endpoint
router.post('/register', authLimiter, async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }

    // Password strength validation
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long and contain both letters and numbers.' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already taken.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    // Create and save new user
    const user = new User({
      username,
      password: hashedPassword,
      emailVerified: false,
      emailVerificationToken,
    });
    await user.save();

    // Send verification email
    const verifyUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/api/auth/verify-email?token=${emailVerificationToken}`;
    await sendMail({
      to: username,
      subject: 'Verify your email',
      html: `<h2>Verify your email</h2><p>Click the button below to verify your email address:</p><a href="${verifyUrl}" style="display:inline-block;padding:10px 20px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:4px;font-weight:bold;">Confirm your mail</a>`
    });

    return res.status(201).json({ message: 'User registered successfully. Please check your email to verify your account.' });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// Email verification endpoint
router.get('/verify-email', async (req: Request, res: Response) => {
  const { token } = req.query;
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ message: 'Invalid or missing token.' });
  }
  try {
    const user = await User.findOne({ emailVerificationToken: token });
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification token.' });
    }
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();
    return res.json({ message: 'Email verified successfully. You can now log in.' });
  } catch (err) {
    console.error('Email verification error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// Login endpoint
router.post('/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    // Check if email is verified
    if (!user.emailVerified) {
      return res.status(403).json({ message: 'Please verify your email before logging in.' });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: '1h' }
    );

    return res.json({ token });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// Resend verification email endpoint
router.post('/resend-verification', async (req: Request, res: Response) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ message: 'Username (email) is required.' });
  }
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'User not found.' });
    }
    if (user.emailVerified) {
      return res.status(400).json({ message: 'Email is already verified.' });
    }
    // Generate new token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = emailVerificationToken;
    await user.save();
    // Send verification email
    const verifyUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/api/auth/verify-email?token=${emailVerificationToken}`;
    await sendMail({
      to: username,
      subject: 'Verify your email',
      html: `<h2>Verify your email</h2><p>Click the button below to verify your email address:</p><a href="${verifyUrl}" style="display:inline-block;padding:10px 20px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:4px;font-weight:bold;">Confirm your mail</a>`
    });
    return res.json({ message: 'Verification email resent. Please check your inbox.' });
  } catch (err) {
    console.error('Resend verification error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// Get current user's profile
router.get('/profile', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    return res.json({
      username: user.username,
      emailVerified: user.emailVerified,
      name: user.name || '',
      phone: user.phone || '',
      address: user.address || '',
      profileImage: user.profileImage || '',
      birthday: user.birthday ? user.birthday.toISOString().slice(0, 10) : '',
    });
  } catch (err) {
    console.error('Profile fetch error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// Update current user's profile (name, phone, address)
router.put('/profile', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { name, phone, address, birthday } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    user.name = name;
    user.phone = phone;
    user.address = address;
    if (birthday !== undefined) user.birthday = birthday ? new Date(birthday) : undefined;
    await user.save();
    return res.json({ message: 'Profile updated successfully.' });
  } catch (err) {
    console.error('Profile update error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// Upload profile image endpoint
router.post('/profile/image', authenticateToken, upload.single('image'), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded.' });
    }
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload_stream(
      { folder: 'profile_images', resource_type: 'image' },
      async (error, result) => {
        if (error || !result) {
          return res.status(500).json({ message: 'Cloudinary upload failed.' });
        }
        // Save image URL to user
        const user = await User.findById(userId);
        if (!user) {
          return res.status(404).json({ message: 'User not found.' });
        }
        user.profileImage = result.secure_url;
        await user.save();
        return res.json({ imageUrl: result.secure_url });
      }
    );
    // Pipe the file buffer to Cloudinary
    if (req.file && req.file.buffer) {
      // @ts-ignore
      result.end(req.file.buffer);
    }
  } catch (err) {
    console.error('Profile image upload error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// Delete current user's account
router.delete('/profile', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    return res.json({ message: 'Account deleted successfully.' });
  } catch (err) {
    console.error('Account deletion error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// Protected test route
router.get('/protected', authenticateToken, (req: Request, res: Response) => {
  res.json({ message: 'This is a protected route!', userId: (req as any).userId });
});

export default router;

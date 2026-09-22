const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const db = require('./db');

const app = express();

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: "Access denied. No token provided." });

  jwt.verify(token, process.env.JWT_SECRET || 'super_secret_key_change_me_in_production', (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token." });
    req.user = user;
    next();
  });
};
app.use(cors());
app.use(express.json());

// Configure Nodemailer for Email Verification
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// REGISTER a new user
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  const cleanEmail = email.trim().toLowerCase();

  try {
    // Check if user exists
    const [existingUsers] = await db.query('SELECT * FROM users WHERE email = ?', [cleanEmail]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: "An account with this email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = Date.now().toString();
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || cleanEmail)}`;
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const emailConfigured = !!process.env.EMAIL_USER;
    const isVerified = !emailConfigured; // Auto-verify if no email configured

    await db.query(
      'INSERT INTO users (id, name, email, password, avatar, isVerified, verificationToken) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, name.trim() || cleanEmail.split('@')[0], cleanEmail, hashedPassword, avatar, isVerified, verificationToken]
    );

    if (emailConfigured) {
      // Send verification email
      const verificationLink = `${req.protocol}://${req.get('host')}/api/verify-email?token=${verificationToken}&email=${cleanEmail}`;
      
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: cleanEmail,
        subject: 'Verify your AI Trip Planner Account',
        html: `
          <h2>Welcome to AI Trip Planner!</h2>
          <p>Please verify your email address by clicking the link below:</p>
          <a href="${verificationLink}">Verify My Email</a>
        `
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("Failed to send email:", error);
          return res.status(201).json({ message: "Account created, but we couldn't send the verification email. Please check backend SMTP settings." });
        } else {
          return res.status(201).json({ message: "Account created! Please check your email to verify your account before logging in." });
        }
      });
    } else {
      const token = jwt.sign(
        { id: userId, email: cleanEmail },
        process.env.JWT_SECRET || 'super_secret_key_change_me_in_production',
        { expiresIn: '7d' }
      );
      return res.status(201).json({ 
        message: "Account created successfully!",
        user: { id: userId, name: name.trim() || cleanEmail.split('@')[0], email: cleanEmail, avatar },
        token: token
      });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error during registration." });
  }
});

// VERIFY EMAIL
app.get('/api/verify-email', async (req, res) => {
  const { token, email } = req.query;

  try {
    const [users] = await db.query('SELECT * FROM users WHERE email = ? AND verificationToken = ?', [email, token]);
    
    if (users.length === 0) {
      return res.status(400).send("Invalid or expired verification link.");
    }

    await db.query('UPDATE users SET isVerified = true, verificationToken = NULL WHERE email = ?', [email]);
    
    res.send("<h1>Email Verified Successfully!</h1><p>You can now go back to the app and log in.</p>");
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error during verification.");
  }
});

// LOGIN
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const cleanEmail = email.trim().toLowerCase();

  try {
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [cleanEmail]);
    if (users.length === 0) {
      return res.status(400).json({ error: "No account found with this email." });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ error: "Incorrect password." });
    }

    // IMPORTANT: Check if email is verified
    if (!user.isVerified) {
      return res.status(403).json({ error: "Please check your email and click the verification link before logging in." });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'super_secret_key_change_me_in_production',
      { expiresIn: '7d' } // Token expires in 7 days
    );

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      token: token
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error during login." });
  }
});

// Get trips for user (Secured)
app.get('/api/trips/:userId', authenticateToken, async (req, res) => {
  // Ensure users can only fetch their own trips
  if (req.user.id !== req.params.userId) {
    return res.status(403).json({ error: "Unauthorized access to user trips." });
  }

  try {
    const [trips] = await db.query('SELECT * FROM trips WHERE userId = ? ORDER BY createdAt DESC', [req.user.id]);
    const formattedTrips = trips.map(t => ({
      id: t.id,
      createdAt: t.createdAt,
      data: typeof t.data === 'string' ? JSON.parse(t.data) : t.data
    }));
    res.json(formattedTrips);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch trips." });
  }
});

// Save new trip (Secured)
app.post('/api/trips', authenticateToken, async (req, res) => {
  const { id, userId, data } = req.body;
  
  if (req.user.id !== userId) {
    return res.status(403).json({ error: "Unauthorized. Cannot save trip for another user." });
  }

  try {
    await db.query(
      'INSERT INTO trips (id, userId, data) VALUES (?, ?, ?)',
      [id, userId, JSON.stringify(data)]
    );
    res.status(201).json({ message: "Trip saved successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to save trip." });
  }
});

// Delete trip (Secured)
app.delete('/api/trips/:id', authenticateToken, async (req, res) => {
  try {
    // Check if trip belongs to user
    const [trips] = await db.query('SELECT * FROM trips WHERE id = ?', [req.params.id]);
    if (trips.length === 0) return res.status(404).json({ error: "Trip not found." });
    if (trips[0].userId !== req.user.id) return res.status(403).json({ error: "Unauthorized to delete this trip." });

    await db.query('DELETE FROM trips WHERE id = ?', [req.params.id]);
    res.json({ message: "Trip deleted." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete trip." });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

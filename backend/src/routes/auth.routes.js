const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

router.post('/signup', async (req, res) => {
    const {full_name, email, password} = req.body;

    if (!full_name || !email || !password) {
        return res.status(400).json({
            success: false,
            message: "Sign-up failed. Please provide full name, email, and password."
        });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const existing = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

      if (existing.rows.length > 0) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(409).json({
          success: false,
          message: "Sign-up failed. Email already exists."
        });
      }

      const password_hash = await bcrypt.hash(password, 10);
      const result = await pool.query('INSERT INTO users (full_name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, full_name, email, created_at', [full_name, email, password_hash]);
      const user = result.rows[0];
        
      const token = jwt.sign(
          {sub: user.id, email: user.email, role: 'PATIENT'}, process.env.JWT_SECRET, {expiresIn: process.env.JWT_EXPIRES_IN}
      );
      await client.query('COMMIT');

      res.status(201).json({
          success: true,
          message: "Account Created Successfully.",
          token,
          user
      });
    }

    catch (err){
      await client.query('ROLLBACK'); 
        console.error("Signup error:", err);
        res.status(500).json({
            success: false,
            message : "SERVER ERROR- Sign-up failed. Please try again later."
        });
    }
    finally {
      client.release();
    }

});

// ─── LOGIN ────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // 1. Check fields provided
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required'
    });
  }

  try {
    // 2. Find user by email
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    const user = result.rows[0];

    // 3. Compare entered password against stored hash
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // 4. Generate JWT token
    const token = jwt.sign(
      { sub: user.id, email: user.email, role: 'PATIENT' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // 5. Send response
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
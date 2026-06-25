const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, async (req, res) => {
  const user_id = req.user.sub;
  const { test } = req.query;

  if (!test) {
    return res.status(400).json({
      success: false,
      message: 'test query parameter is required. Example: /api/timeline?test=Haemoglobin'
    });
  }

  try {
    const result = await pool.query(
      `SELECT 
         ev.value,
         ev.unit,
         ev.is_flagged,
         ev.document_id,
         ev.normal_range_low,
         ev.normal_range_high,
         d.document_date
       FROM extracted_values ev
       JOIN documents d ON ev.document_id = d.id
       WHERE ev.user_id = $1
         AND LOWER(ev.test_name) = LOWER($2)
       ORDER BY d.document_date ASC`,
      [user_id, test]
    );

    res.status(200).json({
      success: true,
      test_name: test,
      count: result.rows.length,
      data_points: result.rows
    });

  } catch (err) {
    console.error('Timeline error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
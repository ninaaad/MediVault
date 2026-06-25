const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');
const { parseReportText } = require('../services/extractionService');

// ─── CREATE DOCUMENT + EXTRACT VALUES ─────────────────
router.post('/', authMiddleware, async (req, res) => {
  const { document_type, document_date, raw_text } = req.body;
  const user_id = req.user.sub; // from JWT token

  if (!document_type || !document_date || !raw_text) {
    return res.status(400).json({
      success: false,
      message: 'document_type, document_date and raw_text are required'
    });
  }

  try {
    // 1. Save the document
    const docResult = await pool.query(
      `INSERT INTO documents (user_id, document_type, document_date, raw_text)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [user_id, document_type, document_date, raw_text]
    );
    const document = docResult.rows[0];

    // 2. Run extraction engine on the raw text
    const extractedValues = parseReportText(raw_text);

    // 3. Save each extracted value to database
    const savedValues = [];
    for (const ev of extractedValues) {
      const evResult = await pool.query(
        `INSERT INTO extracted_values
           (document_id, user_id, test_name, value, unit,
            normal_range_low, normal_range_high, is_flagged, extraction_method)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          document.id,
          user_id,
          ev.test_name,
          ev.value,
          ev.unit,
          ev.normal_range_low,
          ev.normal_range_high,
          ev.is_flagged,
          ev.extraction_method
        ]
      );
      savedValues.push(evResult.rows[0]);
    }

    // 4. Send response
    res.status(201).json({
      success: true,
      message: `Document saved. ${savedValues.length} value(s) extracted.`,
      document,
      extracted_values: savedValues
    });

  } catch (err) {
    console.error('Document creation error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── GET ALL DOCUMENTS FOR LOGGED-IN USER ─────────────
router.get('/', authMiddleware, async (req, res) => {
  const user_id = req.user.sub;

  try {
    const result = await pool.query(
      `SELECT d.*, 
              json_agg(ev.*) as extracted_values
       FROM documents d
       LEFT JOIN extracted_values ev ON ev.document_id = d.id
       WHERE d.user_id = $1
       GROUP BY d.id
       ORDER BY d.document_date DESC`,
      [user_id]
    );

    res.status(200).json({
      success: true,
      documents: result.rows
    });

  } catch (err) {
    console.error('Get documents error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── GET SINGLE DOCUMENT ──────────────────────────────
router.get('/:id', authMiddleware, async (req, res) => {
  const user_id = req.user.sub;
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT d.*,
              json_agg(ev.*) as extracted_values
       FROM documents d
       LEFT JOIN extracted_values ev ON ev.document_id = d.id
       WHERE d.id = $1 AND d.user_id = $2
       GROUP BY d.id`,
      [id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    res.status(200).json({
      success: true,
      document: result.rows[0]
    });

  } catch (err) {
    console.error('Get document error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── DELETE DOCUMENT ──────────────────────────────────
router.delete('/:id', authMiddleware, async (req, res) => {
  const user_id = req.user.sub;
  const { id } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM documents 
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (err) {
    console.error('Delete document error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
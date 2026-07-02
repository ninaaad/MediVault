const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, async (req, res) => {
    const user_id = req.user.sub;

    try {
        // Total documents
        const docsResult = await pool.query(
            'SELECT COUNT(*) FROM documents WHERE user_id = $1',
            [user_id]
        );

        // Total extracted values
        const valuesResult = await pool.query(
            'SELECT COUNT(*) FROM extracted_values WHERE user_id = $1',
            [user_id]
        );

        // Total flagged values
        const flaggedResult = await pool.query(
            'SELECT COUNT(*) FROM extracted_values WHERE user_id = $1 AND is_flagged = true',
            [user_id]
        );

        // Most recent value per test (latest document date)
        const latestResult = await pool.query(
            `SELECT DISTINCT ON (ev.test_name)
                ev.test_name,
                ev.value,
                ev.unit,
                ev.is_flagged,
                d.document_date
             FROM extracted_values ev
             JOIN documents d ON ev.document_id = d.id
             WHERE ev.user_id = $1
             ORDER BY ev.test_name, d.document_date DESC`,
            [user_id]
        );

        res.status(200).json({
            success: true,
            summary: {
                total_documents: parseInt(docsResult.rows[0].count),
                total_extracted_values: parseInt(valuesResult.rows[0].count),
                total_flagged: parseInt(flaggedResult.rows[0].count),
                latest_values: latestResult.rows
            }
        });

    } catch (err) {
        console.error('Summary error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
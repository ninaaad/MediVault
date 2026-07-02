require('dotenv').config();
const express = require('express');
const app = express();
const pool = require('./config/db');
const PORT = process.env.PORT || 5000;

const cors = require('cors');
app.use(cors());

//Middleware- parse JSON bodies on every request
app.use(express.json());

//Routes
const authRoutes = require('./routes/auth.routes');
app.use('/api/auth', authRoutes);

const documentRoutes = require('./routes/documents.routes');
app.use('/api/documents', documentRoutes);

const timelineRoutes = require('./routes/timeline.routes');
app.use('/api/timeline', timelineRoutes);

const summaryRoutes = require('./routes/summary.routes');
app.use('/api/summary', summaryRoutes);

// app.get('/api/db-test', async (req, res) => {
//     try {
//         const result = await pool.query('SELECT NOW()');

//         res.json({
//             success: true,
//             data: result.rows[0]
//         });
//     }
//     catch(error) {
//         console.error(error);

//         res.status(500).json({
//             success: false,
//             error: error.message
//         });
//     }
// });

app.get('/api/health', (req, res) => {
    res.json({
        status: "OK"
    });
});

app.listen(PORT, () => {
    console.log(`Server is running at port ${PORT}`);
});
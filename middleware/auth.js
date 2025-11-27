const jwt = require("jsonwebtoken");
require("dotenv").config();

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Token tidak tersedia" });

  jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
    if (err) return res.status(403).json({ error: "Token tidak valid" });

    req.user = payload.user; // <=== jangan lupa .user
    next();
  });
}

function authorizeRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Token hilang atau tidak valid" });
    }

    if (req.user.role !== role) {
      return res.status(403).json({ error: "Tidak memiliki akses" });
    }

    next();
  };
}

module.exports = { authenticateToken, authorizeRole };


// const jwt = require('jsonwebtoken');
// const JWT_SECRET = process.env.JWT_SECRET;

// function authenticateToken(req, res, next) {
//     const authHeader = req.headers['authorization'];
//     const token = authHeader && authHeader.split(' ')[1];

//     if (!token) return res.status(401).json({ error: 'Token tidak ada' });

//     jwt.verify(token, JWT_SECRET, (err, decoded) => {
//         if (err) return res.status(403).json({ error: 'Token tidak valid atau kedaluwarsa' });

//         req.user = decoded;  // <=== ini penting!
//         next();
//     });
// }

// module.exports = authenticateToken;

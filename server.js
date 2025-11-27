require("dotenv").config();
const express = require("express");
const cors = require("cors");
const db = require("./db.js"); 
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Ambil 2 fungsi dari auth.js
const { authenticateToken, authorizeRole } = require("./middleware/auth.js");

const app = express();
const PORT = process.env.PORT || 3300;
const JWT_SECRET = process.env.JWT_SECRET;

// === MIDDLEWARE ===
app.use(cors());
app.use(express.json());

// === STATUS ROUTE ===
app.get("/status", (req, res) => {
  res.json({ ok: true, service: "film-api" });
});

// === AUTH ROUTES ===
app.post("/auth/register", async (req, res, next) => {
  const { username, password } = req.body;

  if (!username || !password || password.length < 6) {
    return res.status(400).json({
      error: "Username dan password (min 6 char) harus diisi",
    });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const sql =
      "INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id, username";

    const result = await db.query(sql, [
      username.toLowerCase(),
      hashedPassword,
      "user",
    ]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Username sudah digunakan" });
    }
    next(err);
  }
});

// REGISTER ADMIN
app.post("/auth/register-admin", async (req, res, next) => {
  const { username, password } = req.body;

  if (!username || !password || password.length < 6) {
    return res
      .status(400)
      .json({ error: "Username dan password (min 6 char) harus diisi" });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const sql =
      "INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id, username";

    const result = await db.query(sql, [
      username.toLowerCase(),
      hashedPassword,
      "admin",
    ]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Username sudah digunakan" });
    }
    next(err);
  }
});

// === LOGIN ===
app.post("/auth/login", async (req, res, next) => {
  const { username, password } = req.body;

  try {
    const sql = "SELECT * FROM users WHERE username = $1";
    const result = await db.query(sql, [username.toLowerCase()]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: "Kredensial tidak valid" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Kredensial tidak valid" });
    }

    const payload = {
      user: { id: user.id, username: user.username, role: user.role },
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });

    res.json({ message: "Login berhasil", token });
  } catch (err) {
    next(err);
  }
});

// === MOVIES ROUTES ===
app.get("/movies", async (req, res, next) => {
  const sql = `
    SELECT m.id, m.title, m.year,
           d.id AS director_id, d.name AS director_name
    FROM movies m
    LEFT JOIN directors d ON m.director_id = d.id
    ORDER BY m.id ASC
  `;

  try {
    const result = await db.query(sql);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

app.get("/movies/:id", async (req, res, next) => {
  const sql = `
    SELECT m.id, m.title, m.year,
           d.id AS director_id, d.name AS director_name
    FROM movies m
    LEFT JOIN directors d ON m.director_id = d.id
    WHERE m.id = $1
  `;

  try {
    const result = await db.query(sql, [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Film tidak ditemukan" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// CREATE MOVIE
app.post("/movies", authenticateToken, async (req, res, next) => {
  const { title, director_id, year } = req.body;

  if (!title || !director_id || !year) {
    return res.status(400).json({
      error: "title, director_id, dan year wajib diisi",
    });
  }

  const sql =
    "INSERT INTO movies (title, director_id, year) VALUES ($1, $2, $3) RETURNING *";

  try {
    const result = await db.query(sql, [title, director_id, year]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// UPDATE MOVIE
app.put(
  "/movies/:id",
  [authenticateToken, authorizeRole("admin")],
  async (req, res, next) => {
    const { title, director_id, year } = req.body;

    const sql =
      "UPDATE movies SET title = $1, director_id = $2, year = $3 WHERE id = $4 RETURNING *";

    try {
      const result = await db.query(sql, [
        title,
        director_id,
        year,
        req.params.id,
      ]);

      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Film tidak ditemukan" });
      }

      res.json(result.rows[0]);
    } catch (err) {
      next(err);
    }
  }
);

// DELETE MOVIE
app.delete(
  "/movies/:id",
  [authenticateToken, authorizeRole("admin")],
  async (req, res, next) => {
    const sql = "DELETE FROM movies WHERE id = $1 RETURNING *";

    try {
      const result = await db.query(sql, [req.params.id]);

      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Film tidak ditemukan" });
      }

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

// === DIRECTORS ROUTES (INI TUGAS BAB 3) ===
// Aku bisa bikinin kalau kamu mau.

// === FALLBACK 404 ===
app.use((req, res) => {
  res.status(404).json({ error: "Rute tidak ditemukan" });
});

// === ERROR HANDLER ===
app.use((err, req, res, next) => {
  console.error("[SERVER ERROR]", err.stack);
  res.status(500).json({ error: "Terjadi kesalahan pada server" });
});

// === START SERVER ===
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server aktif di http://localhost:${PORT}`);
});


// require('dotenv').config();
// const express = require('express');
// const cors = require('cors');
// const { dbMovies, dbDirectors } = require('./database.js'); // <- perbaikan: hapus ;; ganda
// const app = express();
// const PORT = process.env.PORT || 3300;
// const bcrypt = require('bcryptjs');
// const jwt =  require('jsonwebtoken');
// const JWT_SECRET = process.env.JWT_SECRET;
// const authenticateToken = require('./middleware/authMiddleware');

// app.use(cors());
// app.use(express.urlencoded({ extended: true }));


// // const port = 3100;

// //middleware
// app.use(express.json());


// //  dummy data (id,tiltte,director,year)
// // let movies = [
// //    { id: 1, title: 'LOTR', director: 'Peter Jackson', year: 2010 },
// //    { id: 2, title: 'The Matrix', director: 'The Wachowskis', year: 1999 },
// //    { id: 3, title: 'Interstellar', director: 'Christopher Nolan', year: 2014 },
// // ];

// // let directors = [
// //     { id: 1, name: 'intan rahma', birthYear: 2007 },
// //     { id: 2, name: 'miftahul', birthYear: 2000 },
// //     { id: 3, name: 'syaikhoni', birthYear: 1994 },
// // ];

// // console.log(movies);

// // Route GET semua data film
// app.get("/movies", (req, res) => {
//   dbMovies.all("SELECT * FROM movies", (err, rows) => {
//     if (err) {
//       return res.status(500).json({ message: "Error fetching movies", error: err });
//     }
//     res.json(rows);
//   });
// });


// // === AUTH ROUTES ===
// app.post('/auth/register', (req, res) => {
//     const { username, password } = req.body;
//     if (!username || !password || password.length < 6) {
//         return res.status(400).json({ error: 'Username dan password (min 6 char) harus diisi' });
//     }

//     bcrypt.hash(password, 10, (err, hashedPassword) => {
//         if (err) {
//             console.error("Error hashing:", err);
//             return res.status(500).json({ error: 'Gagal memproses pendaftaran' });
//         }

//         const sql = 'INSERT INTO users (username, password) VALUES (?, ?)';
//         const params = [username.toLowerCase(), hashedPassword];

//         dbDirectors.run(sql, params, function(err) {
//             if (err) {
//                 if (err.message.includes('UNIQUE constraint')) {
//                     return res.status(409).json({ error: 'Username sudah digunakan' });
//                 }
//                 console.error("Error inserting user:", err);
//                 return res.status(500).json({ error: 'Gagal menyimpan pengguna' });
//             }
//             res.status(201).json({ message: 'Registrasi berhasil', userId: this.lastID });
//         });
//     });
// });

// // === LOGIN ROUTE ===
// app.post('/auth/login', (req, res) => {
//     const { username, password } = req.body;
//     if (!username || !password) {
//         return res.status(400).json({ error: 'Username dan password harus diisi' });
//     }

//     const sql = "SELECT * FROM users WHERE username = ?";
//     dbDirectors.get(sql, [username.toLowerCase()], (err, user) => {
//         if (err || !user) {
//             return res.status(401).json({ error: 'Kredensial tidak valid' });
//         }

//         bcrypt.compare(password, user.password, (err, isMatch) => {
//             if (err || !isMatch) {
//                 return res.status(401).json({ error: 'Kredensial tidak valid' });
//             }

//             const payload = { id: user.id, username: user.username };
//             jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
//                 if (err) return res.status(500).json({ error: 'Gagal membuat token' });
//                 res.json({ message: 'Login berhasil', token });
//             });
//         });
//     });
// });


// // POST movie (butuh token)
// app.post('/movies', authenticateToken, (req, res) => {
//     console.log('Request POST /movies oleh user:', req.user.username);
//     const { title, director, year } = req.body;
//     if (!title || !director || !year) {
//         return res.status(400).json({ error: 'Semua field harus diisi' });
//     }

//     const sql = 'INSERT INTO movies (title, director, year) VALUES (?,?,?)';
//     dbMovies.run(sql, [title, director, year], function (err) {
//         if (err) return res.status(500).json({ error: err.message });
//         res.status(201).json({ id: this.lastID, title, director, year });
//     });
// });

// // PUT movie (butuh token)
// app.put('/movies/:id', authenticateToken, (req, res) => {
//     const { title, director, year } = req.body;
//     dbMovies.run(
//         "UPDATE movies SET title = ?, director = ?, year = ? WHERE id = ?",
//         [title, director, year, req.params.id],
//         function (err) {
//             if (err) return res.status(500).json({ error: err.message });
//             res.json({ updated: this.changes });
//         }
//     );
// });

// // DELETE movie (butuh token)
// app.delete('/movies/:id', authenticateToken, (req, res) => {
//     dbMovies.run("DELETE FROM movies WHERE id = ?", [req.params.id], function (err) {
//         if (err) return res.status(500).json({ error: err.message });
//         res.json({ deleted: this.changes });
//     });
// });

// // ================= DIRECTORS =================

// // GET all directors (public)
// app.get('/directors', (req, res) => {
//   dbDirectors.all("SELECT * FROM directors", [], (err, rows) => {
//     if (err) return res.status(500).json({ error: err.message });
//     res.json(rows);
//   });
// });

// // GET director by id (public)
// app.get('/directors/:id', (req, res) => {
//   dbDirectors.get("SELECT * FROM directors WHERE id = ?", [req.params.id], (err, row) => {
//     if (err) return res.status(500).json({ error: err.message });
//     if (!row) return res.status(404).json({ error: "Director not found" });
//     res.json(row);
//   });
// });

// // CREATE director (BUTUH TOKEN)
// app.post('/directors', authenticateToken, (req, res) => {
//   const { name, birthYear } = req.body;
//   dbDirectors.run(
//     "INSERT INTO directors (name, birthYear) VALUES (?, ?)",
//     [name, birthYear],
//     function (err) {
//       if (err) return res.status(500).json({ error: err.message });
//       res.json({ id: this.lastID, name, birthYear });
//     }
//   );
// });

// // UPDATE director (BUTUH TOKEN)
// app.put('/directors/:id', authenticateToken, (req, res) => {
//   const { name, birthYear } = req.body;
//   dbDirectors.run(
//     "UPDATE directors SET name = ?, birthYear = ? WHERE id = ?",
//     [name, birthYear, req.params.id],
//     function (err) {
//       if (err) return res.status(500).json({ error: err.message });
//       res.json({ updated: this.changes });
//     }
//   );
// });

// // DELETE director (BUTUH TOKEN)
// app.delete('/directors/:id', authenticateToken, (req, res) => {
//   dbDirectors.run("DELETE FROM directors WHERE id = ?", [req.params.id], function (err) {
//     if (err) return res.status(500).json({ error: err.message });
//     res.json({ deleted: this.changes });
//   });
// });




// app.get('/', (req, res) => {
//     res.send('Selamat Datang di server Node.js');
// });

// app.get('/', (req, res) => {
//     res.json({
//         message: 'Selamat Datang di server Node.js Tahap Awal, terimakasih',
//     });
// });

// app.get('/status', (req, res) => {
//     res.json({
//         status: 'OK',
//         message: 'Server is running',
//         timestamp: new Date(),
//     });
// });

// // GET semua movies
// app.get('/movies', (req, res) => {
//   const sql = "SELECT * FROM movies ORDER BY id ASC";
//   dbMovies.all(sql, [], (err, rows) => {
//     if (err) return res.status(400).json({ error: err.message });
//     res.json(rows);
//   });
// });

// // GET movie by id
// app.get('/movies/:id', (req, res) => {
//   const sql = "SELECT * FROM movies WHERE id = ?";
//   dbMovies.get(sql, [req.params.id], (err, row) => {
//     if (err) return res.status(500).json({ error: err.message });
//     if (!row) return res.status(404).json({ error: "Movie not found" });
//     res.json(row);
//   });
// });

// // POST movie baru
// app.post('/movies', (req, res) => {
//   const { title, director, year } = req.body;
//   if (!title || !director || !year) {
//     return res.status(400).json({ error: "title, director, year is required" });
//   }
//   const sql = 'INSERT INTO movies (title, director, year) VALUES (?,?,?)';
//   dbMovies.run(sql, [title, director, year], function(err) {
//     if (err) return res.status(500).json({ error: err.message });
//     res.status(201).json({ id: this.lastID, title, director, year });
//   });
// });

// // Update movies
// app.put("/movies/:id", (req, res) => {
//   const { title, director, year } = req.body;
//   dbMovies.run(
//     "UPDATE movies SET title = ?, director = ?, year = ? WHERE id = ?",
//     [title, director, year, req.params.id],
//     function (err) {
//       if (err) return res.status(500).json({ error: err.message });
//       res.json({ updated: this.changes });
//     }
//   );
// });

// // DELETE movies
// app.delete("/movies/:id", (req, res) => {
//   // perbaikan: parameter harus dikirim sebagai array [req.params.id]
//   dbMovies.run("DELETE FROM movies WHERE id = ?", [req.params.id], function (err) {
//     if (err) return res.status(500).json({ error: err.message });
//     res.json({ deleted: this.changes });
//   });
// });


// // GET semua director
// app.get('/directors', (req, res) => {
//   dbDirectors.all("SELECT * FROM directors", [], (err, rows) => {
//     if (err) return res.status(500).json({ error: err.message });
//     res.json(rows);
//   });
// });

// // GET director by id
// app.get('/directors/:id', (req, res) => {
//   dbDirectors.get("SELECT * FROM directors WHERE id = ?", [req.params.id], (err, row) => {
//     if (err) return res.status(500).json({ error: err.message });
//     if (!row) return res.status(404).json({ error: "Director not found" });
//     res.json(row);
//   });
// });

// // CREATE sutradara
// app.post('/directors', (req, res) => {
//   const { name, birthYear } = req.body;
//   dbDirectors.run(
//     "INSERT INTO directors (name, birthYear) VALUES (?, ?)",
//     [name, birthYear],
//     function (err) {
//       if (err) return res.status(500).json({ error: err.message });
//       res.json({ id: this.lastID, name, birthYear });
//     }
//   );
// });

// // UPDATE sutradara
// app.put('/directors/:id', (req, res) => {
//   const { name, birthYear } = req.body;
//   dbDirectors.run(
//     "UPDATE directors SET name = ?, birthYear = ? WHERE id = ?",
//     [name, birthYear, req.params.id],
//     function (err) {
//       if (err) return res.status(500).json({ error: err.message });
//       res.json({ updated: this.changes });
//     }
//   );
// });

// // DELETE sutradara
// app.delete('/directors/:id', (req, res) => {
//   // perbaikan: parameter harus dikirim sebagai array [req.params.id]
//   dbDirectors.run("DELETE FROM directors WHERE id = ?", [req.params.id], function (err) {
//     if (err) return res.status(500).json({ error: err.message });
//     res.json({ deleted: this.changes });
//   });
// });

// // handle 404
// app.use((req, res) => {
//   res.status(404).json({ error: "Route not found" });
// });

// // information server listening
// app.listen(PORT, () => {
//     console.log(`Server running on http://localhost:${PORT}`);
// });


// MOVIES

// GET all movies
// app.get('/movies', (req, res) => {
//     res.json(movies);
// });

// GET movie by id
// app.get('/movies/:id', (req, res) => {
//     const movie = movies.find(m => m.id === parseInt(req.params.id));
//     if (movie) {
//         res.json(movie);
//     } else {
//         res.status(404).send('Movie not found');
//     }
// });

// POST movie
// app.post('/movies', (req, res) => {
//     const { title, director, year } = req.body || {};
//     if (!title || !director || !year) {
//         return res.status(400).json({ error: 'Title, director, and year wajib diisi' });
//     }
//     const newMovie = { id: movies.length + 1, title, director, year };
//     movies.push(newMovie);
//     res.status(201).json(newMovie);
// });

// PUT movie
// app.put('/movies/:id', (req, res) => {
//     const id = parseInt(req.params.id);
//     const movieIndex = movies.findIndex(m => m.id === id);
//     if (movieIndex === -1) {
//         return res.status(404).json({ error: 'Movie not found' });
//     }
//     const { title, director, year } = req.body || {};
//     const updatedMovie = { 
//         id, 
//         title: title || movies[movieIndex].title, 
//         director: director || movies[movieIndex].director, 
//         year: year || movies[movieIndex].year 
//     };
//     movies[movieIndex] = updatedMovie;
//     res.json(updatedMovie);
// });

// DELETE movie
// app.delete('/movies/:id', (req, res) => {
//     const id = parseInt(req.params.id);
//     const movieIndex = movies.findIndex(m => m.id === id);
//     if (movieIndex === -1) {
//         return res.status(404).json({ error: 'Movie tidak ditemukan' });
//     }
//     movies.splice(movieIndex, 1);
//     res.status(204).send();
// });

// DIRECTORS

// GET all directors
// app.get('/directors', (req, res) => {
//     res.json(directors);
// });

// GET director by id
// app.get('/directors/:id', (req, res) => {
//     const director = directors.find(d => d.id === parseInt(req.params.id));
//     if (director) {
//         res.json(director);
//     } else {
//         res.status(404).send('Director not found');
//     }
// });

// POST director
// app.post('/directors', (req, res) => {
//     const { name, birthYear } = req.body || {};
//     if (!name || !birthYear) {
//         return res.status(400).json({ error: 'Name and birthYear wajib diisi' });
//     }
//     const newDirector = { id: directors.length + 1, name, birthYear };
//     directors.push(newDirector);
//     res.status(201).json(newDirector);
// });

// PUT director
// app.put('/directors/:id', (req, res) => {
//     const id = parseInt(req.params.id);
//     const directorIndex = directors.findIndex(d => d.id === id);
//     if (directorIndex === -1) {
//         return res.status(404).json({ error: 'Director not found' });
//     }
//     const { name, birthYear } = req.body || {};
//     const updatedDirector = {
//         id,
//         name: name || directors[directorIndex].name,
//         birthYear: birthYear || directors[directorIndex].birthYear
//     };
//     directors[directorIndex] = updatedDirector;
//     res.json(updatedDirector);
// });

// DELETE director
// app.delete('/directors/:id', (req, res) => {
//     const id = parseInt(req.params.id);
//     const directorIndex = directors.findIndex(d => d.id === id);
//     if (directorIndex === -1) {
//         return res.status(404).json({ error: 'Director not found' });
//     }
//     directors.splice(directorIndex, 1);
//     res.status(204).send();
// });

// SERVER 



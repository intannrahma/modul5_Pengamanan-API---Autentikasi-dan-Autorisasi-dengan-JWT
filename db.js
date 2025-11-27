import pkg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default pool;



// require('dotenv').config();
// const sqlite3 = require('sqlite3').verbose();
// const bcrypt = require('bcryptjs'); // <== tambahkan ini

// // Ambil nama file DB dari .env (dengan fallback)
// const DB_MOVIES = process.env.DB_MOVIES || "movies.db";
// const DB_DIRECTORS = process.env.DB_DIRECTORS || "directors.db";

// // ====== Koneksi ke movies.db ======
// const dbMovies = new sqlite3.Database(DB_MOVIES, (err) => {
//   if (err) {
//     console.error("Error connect ke movies.db:", err.message);
//     throw err;
//   } else {
//     console.log("Connected to movies.db");

//     dbMovies.run(`CREATE TABLE IF NOT EXISTS movies (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       title TEXT NOT NULL, 
//       director TEXT NOT NULL, 
//       year INTEGER NOT NULL
//     );`, (err) => {
//       if (!err) {
//         console.log("Table 'movies' created. Seeding initial data...");
//         const insert = 'INSERT INTO movies (title, director, year) VALUES (?,?,?)';
//         dbMovies.run(insert, ["The Lord of the Rings", "Peter Jackson", 2001]);
//         dbMovies.run(insert, ["The Avengers", "Joss Whedon", 2012]);
//         dbMovies.run(insert, ["Spider-Man", "Sam Raimi", 2002]);
//       }
//     });
//   }
// });

// // ====== Koneksi ke directors.db ======
// const dbDirectors = new sqlite3.Database(DB_DIRECTORS, (err) => {
//   if (err) {
//     console.error("Error connect ke directors.db:", err.message);
//     throw err;
//   } else {
//     console.log("Connected to directors.db");

//     dbDirectors.run(`CREATE TABLE IF NOT EXISTS users (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       username TEXT NOT NULL,
//       password TEXT NOT NULL
//     );`, (err) => {
//       if (err) {
//         console.error("Gagal membuat tabel users:", err.message);
//       } else {
//         console.log("Table 'users' created. Seeding initial user...");
//         const hashedPassword = bcrypt.hashSync("123456", 10);
//         const insert = "INSERT INTO users (username, password) VALUES (?, ?)";
//         dbDirectors.run(insert, ["admin", hashedPassword]);
//       }
//     });

//     // Kalau mau aktifkan lagi bagian directors nanti tinggal buka komentar
//     // dbDirectors.run(`CREATE TABLE IF NOT EXISTS directors (
//     //   id INTEGER PRIMARY KEY AUTOINCREMENT,
//     //   name TEXT NOT NULL, 
//     //   birthYear INTEGER
//     // );`, (err) => {
//     //   if (!err) {
//     //     console.log("Table 'directors' created. Seeding initial data...");
//     //     const insert = 'INSERT INTO directors (name, birthYear) VALUES (?, ?)';
//     //     dbDirectors.run(insert, ["Firman Ardiansyah", 2006]);
//     //     dbDirectors.run(insert, ["Intan Rahma Safira", 2007]);
//     //     dbDirectors.run(insert, ["Husnul Alisah", 2005]);
//     //   }
//     // });
//   }
// });

// // Export dua koneksi database
// module.exports = { dbMovies, dbDirectors };

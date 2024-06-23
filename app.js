const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const session = require('express-session');

const app = express();

// MySQL connection setup
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '@GODisgreat2002',
    database: 'video_platform'
});

db.connect((err) => {
    if (err) {
        throw err;
    }
    console.log('MySQL connected...');
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));

app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true
}));

app.get('/', (req, res) => {
    const username = req.session.username || 'Guest';
    res.render('index', { username });
});

app.get('/signup', (req, res) => {
    res.render('signup');
});

app.post('/signup', (req, res) => {
    const { email, password } = req.body;
    const query = 'INSERT INTO users (email, password) VALUES (?, ?)';
    db.query(query, [email, password], (err, result) => {
        if (err) throw err;
        res.redirect('/login');
    });
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const query = 'SELECT * FROM users WHERE email = ? AND password = ?';
    db.query(query, [email, password], (err, results) => {
        if (err) throw err;
        if (results.length > 0) {
            req.session.username = email;
            res.redirect('/');
        } else {
            res.send('Incorrect email or password');
        }
    });
});

app.get('/video', (req, res) => {
    if (!req.session.username) {
        return res.redirect('/login');
    }

    const videoId = req.query.id || 1;
    const query = 'SELECT * FROM videos WHERE id = ?';
    db.query(query, [videoId], (err, results) => {
        if (err) throw err;
        const video = results[0];
        const prevVideo = videoId > 1 ? videoId - 1 : null;
        const nextVideo = videoId < 10 ? videoId + 1 : null; // Assume 10 videos for simplicity
        res.render('video', { video, prevVideo, nextVideo });
    });
});

app.get('/account', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

//email verfication
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Setup Nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'your-email@gmail.com',
        pass: 'your-email-password'
    }
});

app.post('/signup', (req, res) => {
    const { email, password } = req.body;
    const verificationCode = crypto.randomBytes(20).toString('hex');
    const query = 'INSERT INTO users (email, password, verification_code) VALUES (?, ?, ?)';
    db.query(query, [email, password, verificationCode], (err, result) => {
        if (err) throw err;

        const mailOptions = {
            from: 'your-email@gmail.com',
            to: email,
            subject: 'Account Verification',
            text: `Please verify your account by clicking the following link: http://localhost:3000/verify-email?code=${verificationCode}`
        };

        transporter.sendMail(mailOptions, (err, info) => {
            if (err) throw err;
            res.send('Verification email sent. Please check your inbox.');
        });
    });
});

app.get('/verify-email', (req, res) => {
    const { code } = req.query;
    const query = 'UPDATE users SET verified = TRUE WHERE verification_code = ?';
    db.query(query, [code], (err, result) => {
        if (err) throw err;
        res.send('Email verified successfully!');
    });
});
//password reset
app.get('/reset-password', (req, res) => {
    res.render('reset-password');
});

app.post('/reset-password', (req, res) => {
    const { email } = req.body;
    const resetCode = crypto.randomBytes(20).toString('hex');
    const query = 'UPDATE users SET verification_code = ? WHERE email = ?';
    db.query(query, [resetCode, email], (err, result) => {
        if (err) throw err;

        const mailOptions = {
            from: 'your-email@gmail.com',
            to: email,
            subject: 'Password Reset',
            text: `Please reset your password by clicking the following link: http://localhost:3000/reset-password-confirm?code=${resetCode}`
        };

        transporter.sendMail(mailOptions, (err, info) => {
            if (err) throw err;
            res.send('Password reset email sent. Please check your inbox.');
        });
    });
});

app.get('/reset-password-confirm', (req, res) => {
    const { code } = req.query;
    res.render('reset-password-confirm', { code });
});

app.post('/reset-password-confirm', (req, res) => {
    const { code, newPassword } = req.body;
    const query = 'UPDATE users SET password = ? WHERE verification_code = ?';
    db.query(query, [newPassword, code], (err, result) => {
        if (err) throw err;
        res.send('Password reset successfully!');
    });
});


app.listen(3000, () => {
    console.log('Server started on http://localhost:3000');
});

const express = require('express');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const PORT = 8080; // default port 8080

const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

const urlDatabase = {
  b2xVn2: 'http://www.lighthouselabs.ca',
  '9sm5xK': 'http://www.google.com'
};

const users = {
  userRandomID: {
    id: 'userRandomID',
    email: 'user@example.com',
    password: 'purple-monkey-dinosaur'
  },
  user2RandomID: {
    id: 'user2RandomID',
    email: 'user2@example.com',
    password: 'dishwasher-funk'
  }
};

// Main
app.get('/', (req, res) => {
  res.redirect('/urls/');
});

app.get('/urls.json', (req, res) => {
  res.json(urlDatabase);
});


// Shortened URLs
app.get('/urls', (req, res) => {
  const templateVars = {
    user: users[req.cookies.user_id],
    urls: urlDatabase
  };
  res.render('urls_index', templateVars);
});

app.post('/urls', (req, res) => {
  const shortURL = generateRandomString();
  urlDatabase[shortURL] = req.body.longURL;
  res.redirect(302, `/urls/${shortURL}`);
});

app.post('/urls/:shortURL/edit', (req, res) => {
  urlDatabase[req.params.shortURL] = req.body.longURL;
  res.redirect('/urls/');
});

app.post('/urls/:shortURL/delete', (req, res) => {
  delete urlDatabase[req.params.shortURL];
  res.redirect('/urls/');
});

// Register
app.get('/register', (req, res) => {
  const templateVars = {
    user: users[req.cookies.user_id]
  };
  res.render('register', templateVars);
});

app.post('/register', (req, res) => {
  const templateVars = {
    user: users[req.cookies.user_id]
  };

  if (req.body.email === '' || req.body.password === '' || emailLookup(req.body.email, users)) {
    res.status(400);
    res.render('400_page', templateVars);
  }

  const userID = generateRandomString();
  users[userID] = {
    id: userID,
    email: req.body.email,
    password: req.body.password
  };
  res.cookie('user_id', userID);
  res.redirect('/register/');
});

// Login
app.get('/login', (req, res) => {
  const templateVars = {
    user: users[req.cookies.user_id]
  };
  res.render('login', templateVars);
});

app.post('/login', (req, res) => {
  const templateVars = {
    user: users[req.cookies.user_id]
  };

  const email = req.body.email;
  const password = req.body.password;

  if (!emailLookup(email, users) || !passwordCompare(email, password, users)) {
    res.status(403);
    res.render('403_page', templateVars);
  }
  res.cookie('user_id', req.body.username);
  
  res.redirect('urls');
});

// Logout
app.post('/logout', (req, res) => {
  res.clearCookie('user_id');
  res.redirect('urls');
});

// Create New URL
app.get('/urls/new', (req, res) => {
  const templateVars = {
    user: users[req.cookies.user_id]
  };
  res.render('urls_new', templateVars);
});

// Shortened URL individual pages and redirect
app.get('/urls/:shortURL', (req, res) => {
  const templateVars = {
    user: users[req.cookies.user_id],
    shortURL: req.params.shortURL,
    longURL: urlDatabase[req.params.shortURL]
  };
  res.render('urls_show', templateVars);
});

app.get('/u/:shortURL', (req, res) => {
  const longURL = urlDatabase[req.params.shortURL];
  res.redirect(longURL);
});

// Catch-all for non-existent routes
app.get('*', (req, res) => {
  const templateVars = {
    user: users[req.cookies.user_id]
  };
  res.status(404);
  res.render('404_page', templateVars);
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

// Helper functions
const generateRandomString = () => crypto.randomBytes(3).toString('hex');

const emailLookup = (email, obj) => {
  return Object.keys(obj).some(k => obj[k].email === email);
};

const passwordCompare = (email, password, obj) => {
  const user = Object.keys(obj).filter(k => obj[k].email === email)[0]
  return obj[user].password === password
}
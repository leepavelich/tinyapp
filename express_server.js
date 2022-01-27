const express = require('express');
const cookieSession = require('cookie-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const { CLIENT_RENEG_WINDOW } = require('tls');
const methodOverride = require('method-override');
const { getUserByEmail , generateRandomString, emailLookup, passwordCompare, urlsForUser} = require('./helpers');

const PORT = 8080; // default port 8080
const app = express();
app.set('view engine', 'ejs');

/// /////////////////
// MIDDELWARE     //
/// /////////////////
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieSession({
  name: 'session',
  keys: ['i-dig-that-hole-you-build-that-wall'],

  // Cookie Options
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}))
app.use(methodOverride('_method'))

/// /////////////////
// DATA           //
/// /////////////////
const urlDatabase = {
  b2xVn2: {
    longURL: 'http://www.lighthouselabs.ca',
    userID: 'userRandomID'
  },
  i3BoGr: {
    longURL: 'http://www.google.com',
    userID: 'user2RandomID'
  },
  jk8953: {
    longURL: 'http://www.cbc.ca',
    userID: 'userRandomID'
  }
};

const users = {
  userRandomID: {
    id: 'userRandomID',
    email: 'user@example.com',
    hashedPassword: bcrypt.hashSync('purple', 10)
  },
  user2RandomID: {
    id: 'user2RandomID',
    email: 'user2@example.com',
    hashedPassword: bcrypt.hashSync('dish', 10)
  }
};

/// /////////////////
// ROOT           //
/// /////////////////
app.get('/', (req, res) => {
  // if logged in, redirect
  if (req.session.user_id) {
    res.redirect('/urls/');
  }
  res.redirect('/login/');
});

/// /////////////////
// URLs LIST      //
/// /////////////////
// app.get('/urls.json', (req, res) => {
//   res.json(urlDatabase);
// });

app.get('/urls', (req, res) => {
  // if not logged in, redirect
  if (!req.session.user_id) {
    res.render('access-denied', { user: users[req.session.user_id] });
  }

  const templateVars = {
    user: users[req.session.user_id],
    urls: urlDatabase[req.session.user_id]
  };

  templateVars.urls = urlsForUser(templateVars.user.id, urlDatabase);
  res.render('urls_index', templateVars);
});

app.post('/urls', (req, res) => {
  // if not logged in, error
  if (!req.session.user_id) {
    res.status(405).send('Error 405 Method Not Allowed\n');
  }

  const shortURL = generateRandomString();
  urlDatabase[shortURL] = {
    longURL: req.body.longURL,
    userID: users[req.session.user_id].id
  };
  res.redirect(302, `/urls/${shortURL}`);
});

app.put('/urls/:shortURL/', (req, res) => {
  // if not logged in, redirect
  if (!req.session.user_id) {
    res.render('access-denied', { user: users[req.session.user_id] });
  }

  const templateVars = {
    user: users[req.session.user_id],
    shortURL: req.params.shortURL
  };

  // URL must belong to user
  const userID = templateVars.user.id;
  if (userID !== urlDatabase[req.params.shortURL].userID) {
    res.render('wrong-user', { user: users[req.session.user_id] });
  }

  urlDatabase[req.params.shortURL] = {
    longURL: req.body.longURL,
    userID: users[req.session.user_id].id
  };

  res.redirect('/urls/');
});

app.post('/urls/:shortURL/delete', (req, res) => {
  // if not logged in, redirect
  if (!req.session.user_id) {
    res.render('access-denied', { user: users[req.session.user_id] });
  }

  const templateVars = {
    user: users[req.session.user_id],
    shortURL: req.params.shortURL
  };

  // URL must belong to user
  const userID = templateVars.user.id;
  if (userID !== urlDatabase[req.params.shortURL].userID) {
    res.render('wrong-user', { user: users[req.session.user_id] });
  }

  delete urlDatabase[req.params.shortURL];
  res.redirect('/urls/');
});

/// /////////////////
// REGISTER       //
/// /////////////////
app.get('/register', (req, res) => {
  // if logged in, redirect
  if (req.session.user_id) {
    res.redirect('/urls/');
  }

  const templateVars = {
    user: users[req.session.user_id]
  };

  res.render('register', templateVars);
});

app.post('/register', (req, res) => {
  const templateVars = {
    user: users[req.session.user_id]
  };

  if (req.body.email === '' || req.body.password === '' || emailLookup(req.body.email, users)) {
    res.status(400);
    res.render('400_page', templateVars);
  }

  const password = req.body.password;
  req.session.user_id = generateRandomString();

  users[req.session.user_id] = {
    id: req.session.user_id,
    email: req.body.email,
    hashedPassword: bcrypt.hashSync(password, 10)
  };

  res.redirect('/register/');
});

/// /////////////////
// LOGIN          //
/// /////////////////
app.get('/login', (req, res) => {
  // if logged in, redirect
  if (req.session.user_id) {
    res.redirect('/urls/');
  }

  const templateVars = {
    user: users[req.session.user_id]
  };

  res.render('login', templateVars);
});

app.post('/login', (req, res) => {
  const templateVars = {
    user: users[req.session.user_id]
  };

  const email = req.body.email;
  const password = req.body.password;
  const userID = getUserByEmail(email, users);

  req.session.user_id = userID;

  if (!emailLookup(email, users) || !passwordCompare(email, password, users)) {
    res.status(403);
    res.render('403_page', templateVars);
  }

  res.redirect('urls');
});

/// /////////////////
// LOGOUT         //
/// /////////////////
app.post('/logout', (req, res) => {
  req.session.user_id = null

  res.redirect('/');
});

/// /////////////////
// CREATE NEW URL //
/// /////////////////
app.get('/urls/new', (req, res) => {
  // if not logged in, redirect
  if (!req.session.user_id) {
    res.redirect('/login/');
  }

  const templateVars = {
    user: users[req.session.user_id]
  };
  res.render('urls_new', templateVars);
});

// Shortened URL individual pages and redirect
app.get('/urls/:shortURL', (req, res) => {
  // if not logged in, redirect
  if (!req.session.user_id) {
    res.render('access-denied', { user: users[req.session.user_id] });
  }

  const templateVars = {
    user: users[req.session.user_id],
    shortURL: req.params.shortURL
  };

  // URL must belong to user
  const userID = templateVars.user.id;
  if (userID !== urlDatabase[req.params.shortURL].userID) {
    res.render('wrong-user', { user: users[req.session.user_id] });
  }

  // if page doesn't exist, redirect
  if (!urlDatabase[req.params.shortURL]) {
    res.status(404);
    res.redirect('/404_page/');
  }

  templateVars.longURL = urlDatabase[req.params.shortURL].longURL;

  res.render('urls_show', templateVars);
});

app.get('/u/:shortURL', (req, res) => {
  // if page doesn't exist, redirect
  if (!urlDatabase[req.params.shortURL]) {
    res.status(404);
    res.redirect('/404_page/');
  }

  const longURL = urlDatabase[req.params.shortURL].longURL;
  res.redirect(longURL);
});

/// /////////////////
// 404 OTHER      //
/// /////////////////
app.get('*', (req, res) => {
  const templateVars = {
    user: users[req.session.user_id]
  };
  res.status(404);
  res.render('404_page', templateVars);
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

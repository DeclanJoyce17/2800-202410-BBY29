const express = require('express');
const app = express();

const groqRoute = require('./routes/groqRoute');
app.use(groqRoute);
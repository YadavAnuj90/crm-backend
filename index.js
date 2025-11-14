const express = require("express");
require("dotenv").config();
const connectDB = require("./config/db");
const createAdmin = require("./config/createAdmin");
const auth_route = require('./routes/auth.routes');

const app = express();
app.use(express.json());

app.use('/auth', auth_route);

connectDB();
createAdmin();


app.use(express.json());


app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});

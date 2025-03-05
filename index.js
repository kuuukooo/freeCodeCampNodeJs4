const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const { Schema } = mongoose;
require("dotenv").config();

mongoose.connect(process.env.MONGO_URL);

const userSchema = new Schema({
  username: String,
});
const User = mongoose.model("User", userSchema);

const exerciseSchema = new Schema({
  user_id: { type: String, required: true },
  description: String,
  duration: Number,
  date: Date,
});
const Exercise = mongoose.model("Exercise", exerciseSchema);

app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.get("/api/users", async (req, res) => {
  const users = await User.find({}).select("_id username");
  if (!users) {
    res.send("No hay usuarios");
  } else {
    res.json(users);
  }
});

app.post("/api/users", async (req, res) => {
  console.log(req.body);
  const userObject = new User({ username: req.body.username });
  try {
    const user = await userObject.save();
    console.log(user);
    return res.json(user);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Error al guardar el usuario" });
  }
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  const { _id } = req.params;
  const { description, duration, date } = req.body;

  try {
    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).send("El usuario no se pudo encontrar");
    }

    const exerciseObj = new Exercise({
      user_id: _id,
      description,
      duration,
      date: date ? new Date(date) : new Date(),
    });

    const exercise = await exerciseObj.save();

    res.json({
      id: user._id,
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: new Date(exercise.date).toDateString(),
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("Hubo un error guardando el ejercicio");
  }
});

app.get("/api/users/:_id/logs", async (req, res) => {
  const { from, to, limit } = req.query;
  const { _id } = req.params;
  const user = await User.findById(_id);
  if (!user) {
    return res.status(404).send("El usuario no se pudo encontrar");
  }
  let dateObj = {};
  if (from) {
    dateObj["$gte"] = new Date(from);
  }
  if (to) {
    dateObj["$lte"] = new Date(to);
  }
  let filter = {
    user_id: _id,
  };
  if (from || to) {
    filter.date = dateObj;
  }

  const exercises = await Exercise.find(filter).limit(parseInt(+limit ?? 500));

  const log = exercises.map((e) => ({
    description: e.description,
    duration: e.duration,
    date: e.date.toDateString(),
  }));

  res.json({
    username: user.username,
    count: exercises.length,
    _id: user._id,
    log,
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});

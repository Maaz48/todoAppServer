const express = require("express");
// const bodyParser = require("body-parser");
const signup = require("./models/signUp");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const PushNotifications = require("node-pushnotifications");

mongoose
  .connect(
    "mongodb+srv://app:maaz@cluster0.n7e5erg.mongodb.net/?retryWrites=true&w=majority"
  )
  .then(() => {
    console.log("connected...");
  });

const app = express();

// app.use(bodyParser.json());
app.use(express.json());

const users = [];

const JWT_SECRET = "helloThisIsHelloWorld";

app.post("/signup", async (req, res) => {
  try {
    const { email, password, username } = req.body;
    const existingUser = users.find((user) => user.email === email);
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: "1h" });
    const newUser = new signup({
      message: "User created",
      token,
      isUserCreated: true,
      username,
      email,
      password,
    });
    newUser.save().then((data) => {
      res
        .status(201)
        .json({ message: "User created", token, isUserCreated: true, data });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = users.find((user) => user.email === email);
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: "1h" });
    res.json({ message: "Login successful", token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

//////////////////////////// TASK SCHEMA AND CRUD OPERATIONS //////////////////////////////////
const push = new PushNotifications({
  gcm: {
    id: process.env.GCM_ID,
    phonegap: false,
  },
  apn: {
    token: {
      key: process.env.APN_KEY,
      keyId: process.env.APN_KEY_ID,
      teamId: process.env.APN_TEAM_ID,
    },
    production: false,
  },
});

// Define the task schema
const taskSchema = new mongoose.Schema({
  title: String,
  description: String,
  deadline: Date,
  completed: Boolean,
  user: String,
});

const Task = mongoose.model("Task", taskSchema);

// Define API endpoints
app.get("/tasks", async (req, res) => {
  try {
    const tasks = await Task.find({ user: req.query.user });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/tasks", async (req, res) => {
  const task = new Task({
    title: req.body.title,
    description: req.body.description,
    deadline: req.body.deadline,
    completed: false,
    user: req.body.user,
  });

  try {
    const newTask = await task.save();

    // Schedule a notification for the task deadline
    const deadline = new Date(req.body.deadline);
    const now = new Date();
    if (deadline > now) {
      const notificationTime = deadline - now;
      push.scheduleNotification({
        token: {
          key: process.env.APN_KEY,
          keyId: process.env.APN_KEY_ID,
          teamId: process.env.APN_TEAM_ID,
        },
        title: "Task deadline approaching!",
        body: `Your task "${req.body.title}" is due soon.`,
        topic: "com.example.todo",
        expiry: notificationTime / 1000,
        payload: { taskId: newTask._id },
      });
    }

    res.status(201).json(newTask);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.put("/tasks/:id", async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (task) {
      task.title = req.body.title;
      task.description = req.body.description;
      task.deadline = req.body.deadline;
      task.completed = req.body.completed;

      await task.save();

      res.json(task);
    } else {
      res.status(404).json({ message: "Task not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
//////////////////////////// TASK SCHEMA AND CRUD OPERATIONS //////////////////////////////////

app.listen(3000, () => {
  console.log("Server started on port 3000");
});

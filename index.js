require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const WebSocket = require("ws");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.68dnu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const clients = new Map();

wss.on("connection", (ws) => {
  console.log("WebSocket connected");

  ws.on("message", async (message) => {
    const data = JSON.parse(message);

    if (data.type === "REGISTER") {
      clients.set(data.userId, ws);
      console.log(`User ${data.userId} registered.`);
    }

    if (data.type === "TASK_ADD") {
      const task = data.task;
      const updatedTask = await addTaskToDB(task);

      if (clients.has(task.userEmail)) {
        clients.get(task.userEmail).send(
          JSON.stringify({
            type: "TASK_ADDED",
            task: updatedTask,
          })
        );
      }
    }

    if (data.type === "TASK_UPDATE") {
      const taskWithId = { _id: data._id, ...data.task };
      const updatedTask = await updateTaskInDB(taskWithId);
      if (!updatedTask) {
        ws.send(JSON.stringify({ type: "ERROR", message: "Failed to update task" }));
        return;
      }

      if (clients.has(data.userId)) {
        clients.get(data.userId).send(
          JSON.stringify({
            type: "TASK_UPDATED",
            task: updatedTask,
          })
        );
      }
    }

    if (data.type === "TASK_DELETE") {
      const taskId = data._id;
      const taskDeleted = await deleteTaskFromDB(taskId);

      if (clients.has(data.userId)) {
        clients.get(data.userId).send(
          JSON.stringify({
            type: "TASK_DELETED",
            taskId,
          })
        );
      }
    }
  });

  ws.on("close", () => {
    console.log("WebSocket disconnected");
    clients.forEach((value, key) => {
      if (value === ws) {
        clients.delete(key);
        console.log(`User ${key} disconnected.`);
      }
    });
  });
});

const deleteTaskFromDB = async (taskId) => {
  try {
    const db = client.db("donezoDB");
    const tasksCollection = db.collection("tasks");
    const result = await tasksCollection.deleteOne({
      _id: new ObjectId(taskId),
    });
    return result.deletedCount > 0;
  } catch (error) {
    console.error("Error deleting task:", error);
    return false;
  }
};

async function addTaskToDB(task) {
  try {
    const db = client.db("donezoDB");
    const tasksCollection = db.collection("tasks");
    const result = await tasksCollection.insertOne(task);
    return { _id: result.insertedId, ...task };
  } catch (error) {
    console.error("Error adding task:", error);
    return null;
  }
}

async function updateTaskInDB(updatedTask) {
  try {
    const db = client.db("donezoDB");
    const tasksCollection = db.collection("tasks");

    const taskId = updatedTask._id;
    if (!taskId) throw new Error("Task _id is missing");

    const taskData = { ...updatedTask };
    delete taskData._id;

    const result = await tasksCollection.updateOne(
      { _id: new ObjectId(taskId) },
      { $set: taskData } // Now includes `order` and `category` as needed
    );

    if (result.matchedCount === 0) {
      console.log(`Task with _id ${taskId} not found`);
      return null;
    }

    return tasksCollection.findOne({ _id: new ObjectId(taskId) });
  } catch (error) {
    console.error("Error updating task:", error.message);
    return null;
  }
}

async function run() {
  try {
    await client.connect();
    console.log("Connected to MongoDB!");

    const userCollection = client.db("donezoDB").collection("users");
    const tasksCollection = client.db("donezoDB").collection("tasks");

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: "User Already Exists", insertedId: null });
      }

      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.get("/tasks", async (req, res) => {
      const userEmail = req.query.userEmail;
      const result = await tasksCollection
        .find({ userEmail })
        .sort({ order: 1 }) // Sort by order for consistent retrieval
        .toArray();
      res.send(result);
    });

    app.post("/tasks", async (req, res) => {
      const task = req.body;
      const result = await tasksCollection.insertOne(task);

      if (clients.has(task.userEmail)) {
        clients.get(task.userEmail).send(
          JSON.stringify({ type: "TASK_ADDED", task: { _id: result.insertedId, ...task } })
        );
      }

      res.send(result);
    });
  } catch (error) {
    console.error("Error in MongoDB connection:", error);
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Donezo Server is Running");
});

server.listen(port, () => {
  console.log(`Donezo running on port: ${port}`);
});
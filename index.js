require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const WebSocket = require("ws");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Create HTTP server and attach WebSocket to it
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// MongoDB connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.68dnu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Store user-specific WebSocket connections
const clients = new Map();

wss.on("connection", (ws) => {
  console.log("WebSocket connected");

  ws.on("message", async (message) => {
    const data = JSON.parse(message);

    if (data.type === "REGISTER") {
      clients.set(data.userId, ws);
    }

    if (data.type === "TASK_UPDATE") {
      await updateTaskInDB(data.task);

      if (clients.has(data.userId)) {
        clients.get(data.userId).send(
          JSON.stringify({
            type: "TASK_ADDED",
            task: data.task,
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
      }
    });
  });
});

// delete a task in MongoDB
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

// Update or insert task in MongoDB
async function updateTaskInDB(updatedTask) {
  const db = client.db("donezoDB");
  const tasksCollection = db.collection("tasks");

  await tasksCollection.updateOne(
    { _id: new ObjectId(updatedTask._id) },
    { $set: updatedTask },
    { upsert: true }
  );

  console.log("Task updated or inserted in MongoDB");
}

// Express routes
async function run() {
  try {
    // await client.connect();
    // console.log("Connected to MongoDB!");

    const userCollection = client.db("donezoDB").collection("users");
    const tasksCollection = client.db("donezoDB").collection("tasks");

    // users collection
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
      const result = await tasksCollection.find({ userEmail }).toArray();
      res.send(result);
    });

    app.post("/tasks", async (req, res) => {
      const task = req.body;
      const result = await tasksCollection.insertOne(task);

      if (clients.has(task.userEmail)) {
        clients.get(task.userEmail).send(
          JSON.stringify({ type: "TASK_ADDED", task })
        );
      }

      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Donezo Server is Running");
});

server.listen(port, () => {
  console.log(`Donezo running on port: ${port}`);
});

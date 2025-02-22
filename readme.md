# Donezo Server

Donezo Server is the backend of the Todo application, providing real-time updates, task management, and secure user authentication. The server uses WebSocket for real-time task updates and MongoDB for persistent data storage.

### Live Demo

You can access the live server here: [Donezo Server - Live Demo](https://donezo-server-six.vercel.app/)

### Features

- **Real-Time Updates**: Uses WebSocket (`ws`) for real-time task updates, ensuring tasks are synchronized across clients.
- **Task Management**: Manages task data (add, update, delete, move between categories) in MongoDB.
- **User Authentication**: Secure login system integrated with Firebase for user authentication.
- **Environment Configuration**: Uses `.env` for environment variable management, such as database connection and server configurations.

### Dependencies

This server uses the following dependencies:

- **`cors`**: Middleware for enabling Cross-Origin Resource Sharing (CORS).
- **`dotenv`**: Loads environment variables from a `.env` file into `process.env`.
- **`express`**: A web framework for building the server.
- **`mongodb`**: MongoDB Node.js driver for interacting with the MongoDB database.
- **`ws`**: WebSocket library for enabling real-time communication between the server and clients.

### Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/Atef-Abrar-Bhuyian/Donezo-Server.git
   ```

2. Navigate to the project directory:

cd donezo-server

3. Install the dependencies:

npm install

4. Create a .env file in the root directory and add your environment variables:

MONGO_URI=your-mongodb-uri
PORT=your-preferred-port

5. Start the server:

npm run start




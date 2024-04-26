const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const crypto = require("crypto");

const app = express();
const port = 3000;
const cors = require("cors");
app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const jwt = require("jsonwebtoken");
const moment = require("moment");

// Conectando ao MongoDB
mongoose
  .connect("mongodb+srv://sujan:sujan@cluster0.zjqdesc.mongodb.net/")
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((error) => {
    console.log("Error connectin to mongoDb", error);
  });

// Iniciando o servidor
app.listen(port, () => {
  console.log("Server is running on port 3000");
});

// Importando os modelos de dados
const User = require("./models/user");
const Todo = require("./models/todo");

// Endpoint para registrar um novo usuário
app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Verificando se o email já está registrado
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log("Email already registered");
    }

    // Criando um novo usuário
    const newUser = new User({
      name,
      email,
      password,
    });

    // Salvando o novo usuário no banco de dados
    await newUser.save();

    res.status(202).json({ message: "User registered successfully" });
  } catch (error) {
    console.log("Error registering the user", error);
    res.status(500).json({ message: "Registration failed" });
  }
});

// Gerando uma chave secreta para JWT
const generateSecretKey = () => {
  const secretKey = crypto.randomBytes(32).toString("hex");

  return secretKey;
};

const secretKey = generateSecretKey();

// Endpoint para autenticação do usuário
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Procurando o usuário pelo email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid Email" });
    }

    // Verificando a senha do usuário
    if (user.password !== password) {
      return res.status(401).json({ message: "Invalid password" });
    }

    // Gerando um token JWT para autenticação
    const token = jwt.sign({ userId: user._id }, secretKey);

    res.status(200).json({ token });
  } catch (error) {
    console.log("Login failed", error);
    res.status(500).json({ message: "Login failed" });
  }
});

// Endpoint para adicionar uma nova tarefa (todo) para um usuário específico
app.post("/todos/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const { title, category } = req.body;

    // Criando uma nova tarefa
    const newTodo = new Todo({
      title,
      category,
      dueDate: moment().format("YYYY-MM-DD"),
    });

    // Salvando a nova tarefa no banco de dados
    await newTodo.save();

    // Associando a nova tarefa ao usuário
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
    }

    user.todos.push(newTodo._id);
    await user.save();

    res.status(200).json({ message: "Todo added successfully", todo: newTodo });
  } catch (error) {
    res.status(200).json({ message: "Todo not added" });
  }
});

// Endpoint para obter as tarefas (todos) de um usuário específico
app.get("/users/:userId/todos", async (req, res) => {
  try {
    const userId = req.params.userId;

    // Procurando o usuário pelo ID e populando as tarefas associadas
    const user = await User.findById(userId).populate("todos");
    if (!user) {
      return res.status(404).json({ error: "user not found" });
    }

    res.status(200).json({ todos: user.todos });
  } catch (error) {
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Endpoint para marcar uma tarefa como concluída
app.patch("/todos/:todoId/complete", async (req, res) => {
  try {
    const todoId = req.params.todoId;

    // Atualizando o status da tarefa para 'completed'
    const updatedTodo = await Todo.findByIdAndUpdate(
      todoId,
      {
        status: "completed",
      },
      { new: true }
    );

    if (!updatedTodo) {
      return res.status(404).json({ error: "Todo not found" });
    }

    res
      .status(200)
      .json({ message: "Todo marked as complete", todo: updatedTodo });
  } catch (error) {
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Endpoint para obter o número total de tarefas concluídas e pendentes
app.get("/todos/count", async (req, res) => {
  try {
    // Contando o número total de tarefas concluídas
    const totalCompletedTodos = await Todo.countDocuments({
      status: "completed",
    }).exec();

    // Contando o número total de tarefas pendentes
    const totalPendingTodos = await Todo.countDocuments({
      status: "pending",
    }).exec();

    res.status(200).json({ totalCompletedTodos, totalPendingTodos });
  } catch (error) {
    res.status(500).json({ error: "Network error" });
  }
});

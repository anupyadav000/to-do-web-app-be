const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
var cors = require("cors");
const jwt = require("jsonwebtoken");
const secretKey = "your-secret-key";

const uri =
  "mongodb+srv://anupyadav20177:hGN9giLMhyd8rZn5@cluster0.wyxmqal.mongodb.net/to-do";

mongoose.connect(uri);

const toDoSchema = new mongoose.Schema({
  toDo: String,
  userId: String,
});
const toDoModel = mongoose.model("ToDo", toDoSchema);

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  hashedPassword: String,
});
const userModel = mongoose.model("User", userSchema);

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.post("/user/register", async (req, res) => {
  const userQuery = userModel.find({ email: req.body.email });
  const userDetails = await userQuery.exec();

  if (userDetails.length !== 0) {
    res.status(400).send("user already registered");
    return;
  }

  bcrypt.hash(req.body.password, 10, async (err, hashedPwd) => {
    if (err) {
      res.status(500).send(err);
    }
    const newUser = new userModel({
      name: req.body.name,
      email: req.body.email,
      hashedPassword: hashedPwd,
    });

    newUser.save().then(async () => {
      const userQuery = userModel.find({ email: req.body.email });
      const userDetails = await userQuery.exec();
      if (userDetails.length === 0 || req.body.email === undefined) {
        res.status(400).send("user does not exist");
        return;
      }
      const registeredUser = {
        name: req.body.name,
        email: req.body.email,
        id: userDetails[0].id,
      };
      const token = jwt.sign(registeredUser, secretKey, { expiresIn: "1y" });
      res.status(200).send({
        token: token,
      });
      return;
    });
  });
});

app.post("/user/login", async (req, res) => {
  const userQuery = userModel.find({ email: req.body.email });
  const userDetails = await userQuery.exec();
  if (userDetails.length === 0 || req.body.email === undefined) {
    res.status(400).send("user does not exist");
    return;
  }
  bcrypt.compare(
    req.body.password,
    userDetails[0].hashedPassword,
    (err, result) => {
      if (err) {
        res.status(500).send(err);
        return;
      }
      if (result) {
        const loginUser = {
          name: userDetails[0].name,
          email: req.body.email,
          id: userDetails[0].id,
        };
        const token = jwt.sign(loginUser, secretKey, { expiresIn: "1y" });
        res.status(200).send({
          token: token,
        });
        return;
      } else {
        res.status(400).send("password did not match");
      }
    }
  );
});

app.patch("/user", async (req, res) => {
  const userQuery = userModel.find({ email: req.query.email });
  const usersList = await userQuery.exec();
  if (usersList.length === 0) {
    res.status(400).send("user does not exist");
    return;
  }

  if (req.body.password !== undefined) {
    bcrypt.hash(req.body.password, 10, async (err, hashPwd) => {
      if (err) {
        res.status(500).send(err);
        return;
      }
      const newUser = {
        name: req.body.name,
        email: req.body.email,
        hashedPassword: hashPwd,
      };

      const updateUserQuery = userModel.findOneAndUpdate(
        { email: req.query.email },
        newUser
      );

      const updateUserResponse = await updateUserQuery.exec();
      if (updateUserResponse === null) {
        res.status(500).send("update user details failed");
      }
      res.send(updateUserResponse);
    });
  } else {
    const newUser = {
      name: req.body.name,
      email: req.body.email,
      hashedPassword: usersList[0].hashedPassword,
    };

    const updateUserQuery = userModel.findOneAndUpdate(
      { email: req.query.email },
      newUser
    );
    const updateUserResponse = await updateUserQuery.exec();
    res.status(200).send(updateUserResponse);
  }
});

app.post("/toDo", async (req, res) => {
  const token =
    req.headers["authorization"] && req.headers["authorization"].split(" ")[1];
  if (!token)
    return res.status(401).send({
      error: "Unauthorized, token is missing",
    });
  jwt.verify(token, secretKey, async (err, user) => {
    if (err) {
      return res.status(403).send({
        error: "Forbidden, token is invalid",
      });
    } else {
      const findToDoQuery = toDoModel.find({
        toDo: req.body.toDo,
        userId: user.id,
      });
      const toDoFindList = await findToDoQuery.exec();
      if (toDoFindList.length !== 0) {
        res.status(400).send("to-do already created");
        return;
      }
      const newToDo = new toDoModel({
        toDo: req.body.toDo,
        userId: user.id,
      });
      newToDo.save();
      res.status(200).send("to-do added correctly");
    }
  });
});

app.get("/toDo", async (req, res) => {
  const token =
    req.headers["authorization"] && req.headers["authorization"].split(" ")[1];
  if (!token)
    return res.status(401).send({
      error: "Unauthorized, token is missing",
    });
  jwt.verify(token, secretKey, async (err, user) => {
    if (err) {
      return res.status(403).send({
        error: "Forbidden, token is invalid",
      });
    } else {
      const userId = user.id;
      const findToDoQuery = toDoModel.find({ userId: userId });
      const toDoList = await findToDoQuery.exec();
      res.status(200).send(toDoList);
    }
  });
});

app.patch("/toDo", async (req, res) => {
  const token =
    req.headers["authorization"] && req.headers["authorization"].split(" ")[1];
  if (!token)
    return res.status(401).send({
      error: "Unauthorized, token is missing",
    });
  jwt.verify(token, secretKey, async (err, user) => {
    if (err) {
      return res.status(403).send({
        error: "Forbidden, token is invalid",
      });
    } else {
      const userId = user.id;
      const updateToDoQuery = toDoModel.findOneAndUpdate(
        { toDo: req.query.toDo, userId: userId },
        { toDo: req.body.newToDo, userId: userId }
      );
      const updateResponse = await updateToDoQuery.exec();
      if (updateResponse === null) {
        res.status(500).send("to-do record does not exist");
      }
      res.status(200).send(updateResponse);
    }
  });
});

app.delete("/toDo", async (req, res) => {
  const token =
    req.headers["authorization"] && req.headers["authorization"].split(" ")[1];
  if (!token)
    return res.status(401).send({
      error: "Unauthorized, token is missing",
    });
  jwt.verify(token, secretKey, async (err, user) => {
    if (err) {
      return res.status(403).send({
        error: "Forbidden, token is invalid",
      });
    } else {
      const userId = user.id;
      const deleteToDoQuery = toDoModel.findOneAndRemove({
        toDo: req.query.toDo,
        userId: userId,
      });
      const deleteResponse = await deleteToDoQuery.exec();
      if (deleteResponse === null) {
        res.status(500).send("to-do record does not exist");
      }
      res.status(200).send(deleteResponse);
    }
  });
});

app.listen("4000", (err, res) => {
  if (!err) {
    console.log("server running on port 4000");
  }
});

require("dotenv").config();
const express = require("express");
const {Pool} = require("pg");

const app = express();
const port = process.env.PORT || 3000;

// Connexion à PostgreSQL
const pool = new Pool({
  user: process.env.DATABASE_USER,
  host: process.env.DATABASE_HOST,
  database: process.env.DATABASE_NAME,
  password:process.env.DATABASE_PASSWORD,
  port: process.env.DATABASE_PORT
});

// Création de la table users (à exécuter une seule fois)
pool.query(`CREATE TABLE IF NOT EXISTS users(
  id SERIAL PRIMARY KEY,
  title TEXT,
  content TEXT,
  author JSONB
)`)
.then(() => console.log("La table users a été crée ou est déjà existante."))
.catch(err => console.error(`Une erreur s'est produite lors de la tentative de création d'une table users : ${err}.`));

// Middleware pour parser le JSON
app.use(express.json());


// Définir les routes
app.get("/", (req, res) => {
  res.send("Hello from your CV API !");
});

app.get("/users", async (req, res) => {
  try{
    const result = await pool.query("SELECT * FROM users ORDER BY id ASC");

    if(result.rows.length <= 0 || !result.rows){
      throw new Error("La table users est vide ou inexistante.");
    }

    res.status(200).json(result.rows);

  }catch(err){
    res.status(500).json({
      "message": `Une erreur s'est produite lors de la tentative de récupération des données de la table users : ${err}.`
    });
  }
});

app.post("/users", async (req,res) => {
  try{
    const {title, email, resume} = req.body;

    const result = await pool.query("INSERT INTO users(title, email, resume) VALUES($1, $2, $3) RETURNING *", [title, email, resume]);
    res.status(201).json({
      result: result.rows[0]
    });
  }catch(err){
    console.error(err);
    res.status(500).json({
      message: `Erreur lors de la création de l'utilisateur : ${err}`,
      reqBody: `${JSON.stringify(req.body)}`
    });
  }
});

app.put("/users/edit", async (req, res) => {
  try{
    const {id = null, title, email, resume} = req.body;

    if(id === null){
      const result = await pool.query("INSERT INTO users(title, email, resume) VALUES($1, $2, $3) RETURNING *", [title, email, resume]);
      res.status(201).json({
        message: "Un nouvel utilisateur a été ajouté à la table users.",
        result: result.rows
      });
    }else{
      const result = await pool.query("UPDATE users SET title=$2, email=$3, resume=$4 WHERE id=$1", [id, title, email, resume]);
      res.status(200).json(result);
    }

  }catch(err){
    res.status(500).json({
      "message": `Echec de la tentative de mise à jour des données sur la table users : ${err}`
    });
  }
});

app.patch("/users/edit/name", async (req,res) => {
  try{

    const {id, title, ...params} = req.body;

    const result = pool.query("UPDATE users SET title=$2 WHERE id=$1", [id, title]);

    res.status(200).json({
      message: "Le nom de l'utilisateur a été modifié.",
      result: result,
      params: params
    });

  }catch(err){
    res.status(500).json({
      message: `Une erreur s'est produite lors de la mise à jour du nom de l'utilisateur : ${err}`
    });
  }
});

// On lance le serveur Express
app.listen(port, () => console.log(`Le serveur écoute le port 
${port}.`));
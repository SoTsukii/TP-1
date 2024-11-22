require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");

const app = express();
const port = process.env.PORT || 3000;

// Connexion à PostgreSQL
const pool = new Pool({
  user: process.env.DATABASE_USER,
  host: process.env.DATABASE_HOST,
  database: process.env.DATABASE_NAME,
  password: process.env.DATABASE_PASSWORD,
  port: process.env.DATABASE_PORT,
});

// Création de la table articles (à exécuter une seule fois)
pool.query(`CREATE TABLE IF NOT EXISTS articles(
  id SERIAL PRIMARY KEY,
  title TEXT,
  content TEXT,
  author JSONB
)`)
  .then(() => console.log("La table articles a été créée ou est déjà existante."))
  .catch((err) =>
    console.error(`Une erreur s'est produite lors de la tentative de création de la table articles : ${err}.`)
  );

// Middleware pour parser le JSON
app.use(express.json());

// Définir les routes
app.get("/", (req, res) => {
  res.send("Hello from your Articles API !");
});

// Récupérer tous les articles
app.get("/articles", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM articles ORDER BY id ASC");

    if (result.rows.length <= 0) {
      throw new Error("La table articles est vide ou inexistante.");
    }

    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({
      message: `Une erreur s'est produite lors de la tentative de récupération des articles : ${err}.`,
    });
  }
});

// Ajouter un nouvel article
app.post("/articles", async (req, res) => {
  try {
    const { title, content, author } = req.body;

    const result = await pool.query(
      "INSERT INTO articles(title, content, author) VALUES($1, $2, $3) RETURNING *",
      [title, content, author]
    );
    res.status(201).json({
      result: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: `Erreur lors de la création de l'article : ${err}`,
      reqBody: `${JSON.stringify(req.body)}`,
    });
  }
});

// Supprimer un article
app.delete("/articles/delete", async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({
        message: "L'identifiant de l'article (id) est requis pour effectuer une suppression.",
      });
    }

    const result = await pool.query("DELETE FROM articles WHERE id = $1 RETURNING *", [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Aucun article trouvé avec cet identifiant.",
      });
    }

    res.status(200).json({
      message: "L'article a été supprimé avec succès.",
      deletedArticle: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({
      message: `Une erreur s'est produite lors de la tentative de suppression de l'article : ${err}`,
    });
  }
});

// Lancer le serveur Express
app.listen(port, () => console.log(`Le serveur écoute sur le port ${port}.`));

import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "1234",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
let currentUserId = 1;

let users = [
  { id: 1, name: "Angela", color: "teal" },
  { id: 2, name: "Jack", color: "powderblue" },
];


async function checkVisited() {
  const result = await db.query("SELECT country_code FROM visited_countries JOIN users ON users.id=user_id  WHERE user_id= $1;",  
[currentUserId]);
let countries = [];
  result.rows.forEach((row) => {
  countries.push(row.country_code);
  }
  );
  // Return an object containing both countries and user info
  return countries;
}
async function getCurrentUser() {
  const result = await db.query("SELECT * FROM users")
  users= result.rows; 
  return result.rows.find((user) => user.id == currentUserId)
}

app.get("/", async (req, res) => {
  const countries = await checkVisited();
  const currentUser = await getCurrentUser();
  try {
    res.render("index.ejs", {
      countries: countries,
      total: countries.length,
      users: users,
      color: currentUser.color,
    });
  } catch (err) {
    console.error("get error", err);
    res.render("index.ejs", { error: err })
  }

});
app.post("/add", async (req, res) => {
  const input = req.body["country"];  // Country name
  const currentUser = await getCurrentUser();
  
  try {
    // Fetch the country_code based on the input
    const result = await db.query(
    "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
    [input.toLowerCase()]
    );

    
      const countryCode = result.rows[0].country_code;
     try{
      await db.query(
        `INSERT INTO visited_countries (country_code, user_id) VALUES($1,$2)`,
        [countryCode, currentUserId]
        );
        // Refetch countries after the new one is inserted
        res.redirect("/");
     } catch (err){
      console.log(err);
     }
     
    
    
  } catch (err) {
    console.log("Error in the add ROunte ", err);
    
    
  }
});

app.post("/user", async (req, res) => {

  if(req.body["add"]==="new"){
    res.render("new.ejs")
  } else{
    currentUserId = req.body["user"];
    res.redirect("/");
  }
});
  

app.post("/new", async (req, res) => {
  //Hint: The RETURNING keyword can return the data that was inserted.
  //https://www.postgresql.org/docs/current/dml-returning.html
  const { name, color } = req.body;

  try {
    const result = await db.query(
      "INSERT INTO users (name, color) VALUES ($1, $2) RETURNING *",
      [name, color]
    );
    const id = result.rows[0].id;
  currentUserId = id;
    res.redirect("/");
  } catch (err) {
    console.error(err);
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

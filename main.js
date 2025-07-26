const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

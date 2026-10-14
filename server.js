const express = require("express");
const path = require("path");

const app = express();
const PORT = 49169; 

// Serve all static files (HTML, CSS, JS) from the src folder
app.use(express.static(path.join(__dirname, "public")));

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
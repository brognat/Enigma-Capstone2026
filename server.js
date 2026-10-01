const express = require("express");
const path = require("path");

const app = express();
// Change this to the actual port we get from the merrimack server administartor 
const PORT = 5500; 

// Serve all static files (HTML, CSS, JS) from the src folder
app.use(express.static(path.join(__dirname, "public")));

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./views/**/*{.ejs,.html}", 
    "./public/**/*.html", // Adjust for public HTML files
    "./src/**/*.js",
    "./node_modules/flowbite/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        "theme-bg": "#B1A2FF",
        "main-white":"#F5F7FA",
        "button-color":"#6832E9",
        "secondry-button":"#5C59E8"
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'], // Add the Inter font
      },
    },
  },
  plugins: [require('flowbite/plugin')],
}


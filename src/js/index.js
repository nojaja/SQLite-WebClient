//View///////////////////////////////////////////////////
document.addEventListener("DOMContentLoaded", function(){
  // Handler when the DOM is fully loaded
  let container = document.querySelector(".container")
    if(container){
      console.log(container);
    }
});

window.addEventListener('load', (event) => {
  let container = document.querySelector(".container")
    if(container){
      console.log(container);      
      exec();
    }
});

import initSqlJs from "sql.js";


const config = {
  // Required to load the wasm binary asynchronously. Of course, you can host it wherever you want
  // You can omit locateFile completely when running in node
  //locateFile: file => `https://sql.js.org/dist/${file}`
  //locateFile: filename => `/dist/${filename}`
  locateFile: file => './sql-wasm.wasm'
}

let db;
initSqlJs(config).then(function(SQL){
  //Create the database
  db = new SQL.Database()
})

let exec = function () {
  var sqlList = document.getElementById("sql").innerHTML.replace(/\n/g, "").split(";");
  sqlList.forEach(function(sql, index, ar) {
    if(sql){
      console.log(sql);
      addResult(sql);
      var res = db.exec(sql);
      res.forEach(function(result, index, ar) {
        console.log(result);
        if(result.columns){
          addResult(result.columns);
        }
        result.values.forEach(function(value, index, ar) {
          addResult(value);
        });
      });
    }
  });
}

function addResult(data) {
        var code = document.createElement("li");
        code.innerHTML = JSON.stringify(data);
        document.getElementById("output").appendChild(code);
}

document.getElementById("exec").onclick = exec
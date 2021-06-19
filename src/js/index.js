//View///////////////////////////////////////////////////
document.addEventListener("DOMContentLoaded", function () {
  // Handler when the DOM is fully loaded
  let container = document.querySelector(".container")
  if (container) {
    console.log(container);
  }
});

window.addEventListener('load', (event) => {
  let container = document.querySelector(".container")
  if (container) {
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
initSqlJs(config).then(function (SQL) {
  //Create the database
  db = new SQL.Database()
})

/**
 * Saves a file by creating a downloadable instance, and clicking on the
 * download link.
 *
 * @param {string} filename Filename to save the file as.
 * @param {arrayBuffer} contents Contents of the file to save.
 */
// function saveAsLegacy(filename, contents) {
function saveAsLegacy(filename, contents) {
  let atag = document.createElement('a')
  atag.id = "aDownloadFile"
  atag.download = true

  filename = filename || 'Untitled.db';
  const opts = { type: 'application/sqlite.db' };
  const file = new File([contents], '', opts);
  atag.href = window.URL.createObjectURL(file);
  atag.setAttribute('download', filename);
  atag.click();
};

let dataexport = function () {
  saveAsLegacy('Untitled.db', db.export())
}

/**
 * Uses the <input type="file"> to open a new file
 *
 * @return {!Promise<File>} File selected by the user.
 */
function getFileLegacy() {
  let inputtag = document.createElement('input')
  inputtag.id = "filePicker"
  inputtag.type = "file"
  //document.body.appendChild(inputtag)

  return new Promise((resolve, reject) => {
    inputtag.onchange = (e) => {
      const file = inputtag.files[0];
      if (file) {
        resolve(file);
        return;
      }
      reject(new Error('AbortError'));
    };
    inputtag.click();
  });
};

/**
 * Reads the raw text from a file.
 *
 * @private
 * @param {File} file
 * @return {Promise<string>} A promise that resolves to the parsed string.
 */
function readFileLegacy(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.addEventListener('loadend', (e) => {
      const content = e.srcElement.result;
      resolve(content);
    });
    reader.readAsBinaryString(file);
  });
}
let dataimport = function () {
  initSqlJs(config).then(async function (SQL) {
    // Load the db
    const filebuffer = await getFileLegacy()
    const contents = await readFileLegacy(filebuffer);
    db = new SQL.Database(contents)
  });
}


let exec = function () {
  const sqls = document.getElementById("sql").value.replace(/\n/g, "").split(";");
  sqls.forEach(function (sql, index, ar) {
    if (sql) {
      console.log(sql);
      addResult('sql    > ' + sql);
      let res;
      try {
        res = db.exec(sql);
        console.log(res);
        res.forEach(function (result, index, ar) {
          console.log(result);
          if (result.columns) {
            addResult('result.columns> ' + result.columns);
          }
          result.values.forEach(function (value, index, ar) {
            addResult('result.value> ' + value);
          });
        });
      } catch (error) {
        console.log(error);
        addResult('error > ' + error.message);
      }
    }
  });
}

function addResult(data) {
  var code = document.createElement("li");
  code.innerHTML = JSON.stringify(data);
  document.getElementById("output").appendChild(code);
}

document.getElementById("exec").onclick = exec
document.getElementById("dataexport").onclick = dataexport
document.getElementById("dataimport").onclick = dataimport
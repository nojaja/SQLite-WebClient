# SQLite-WebClient

[![License](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)

A fully functional SQLite client running in the browser. Using WebAssembly technology, you can manipulate SQLite databases within the browser without any server-side setup.

**Live Demo**: [https://nojaja.github.io/SQLite-WebClient/](https://nojaja.github.io/SQLite-WebClient/)

## Project Overview

SQLite-WebClient is a web application that allows you to manipulate SQLite databases in your browser using [@sqlite.org/sqlite-wasm](https://www.npmjs.com/package/@sqlite.org/sqlite-wasm). All processing is completed on the client side, with a design that prioritizes privacy and security.

## Project Structure

```
SQLite-WebClient/
├── src/
│   ├── js/
│   │   ├── index.js           # Entry point & UI logic
│   │   └── SQLiteManager.js   # SQLite WASM management class
│   ├── html/
│   │   └── index.html         # Main HTML template
│   ├── css/                   # Stylesheets (optional)
│   └── assets/                # Static assets (optional)
├── dist/                      # Build output directory
├── package.json               # Project configuration
├── webpack.config.js          # Webpack configuration
├── LICENSE                    # MIT License
└── README.md                  # This file
```

## Technology Stack

### Core Dependencies
- **[@sqlite.org/sqlite-wasm](https://www.npmjs.com/package/@sqlite.org/sqlite-wasm)** (^3.45.3-build3) - Official SQLite WebAssembly implementation
- **[dbgate-query-splitter](https://www.npmjs.com/package/dbgate-query-splitter)** (^4.11.4) - SQL query splitting
- **path-browserify** (^1.0.1) - Path handling for browser environment
- **process** (^0.11.10) - Node.js compatible process polyfill

### Development Environment
- **Webpack 5** (^5.89.0) - Module bundler
- **webpack-dev-server** (^4.15.2) - Development server
- **copy-webpack-plugin** (^11.0.0) - WASM file copying
- **html-webpack-plugin** (^4.5.2) - HTML file generation
- **cross-env** (^7.0.3) - Cross-platform environment variable setting

## Key Features

### ✅ Implemented Features

1. **SQL Query Execution**
   - Retrieve SQLite version information
   - Basic SQL operations (CREATE, INSERT, SELECT, etc.)
   - Sequential execution of multiple SQL statements (semicolon-separated)
   - Real-time display of query results

2. **Database Management**
   - Create in-memory databases within the browser
   - Export database (.db file download)
   - Import database (load local .db files)

3. **SQLiteManager API**
   - Database initialization & setup
   - Prepared statement overrides
   - Query splitting & execution (dbgate-query-splitter integration)
   - Schema information retrieval (tables, views, indexes, triggers)
   - Table structure retrieval (PRAGMA table_info)

4. **Cross-Platform Support**
   - Browser environment execution
   - Node.js environment execution (conditional)
   - VFS (Virtual File System) file operations

## Setup

### Prerequisites
- Node.js v14 or later
- npm v6 or later
- Modern browser (WebAssembly support)

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/nojaja/SQLite-WebClient.git
   cd SQLite-WebClient
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm start
   ```

4. **Access in browser**
   ```
   http://localhost:8080
   ```

## Usage

### Web Application Usage

#### Running in Development Environment

```bash
# Start development server (with hot reload)
npm start

# Access http://localhost:8080 in browser
```

#### Executing SQL Queries

1. Enter SQL query in the text area
   ```sql
   SELECT sqlite_version();
   CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT);
   INSERT INTO users VALUES (1, 'Alice');
   SELECT * FROM users;
   ```

2. Click the **"execute"** button to run

3. Results will be displayed in the output area below
   - `sql >` - Executed SQL statement
   - `result.columns>` - Column names
   - `result.values>` - Retrieved data

#### Database Export/Import

- **Export**: Click "Database Export" button → Download as `Untitled.db`
- **Import**: Click "Database Import" button → Select local .db file

### Using as a Library

#### SQLiteManager Class Initialization

```javascript
import SQLiteManager from './SQLiteManager.js';

// Initialize in browser environment
const sqliteManager = await SQLiteManager.initialize(null, {
  print: console.log,
  printErr: console.error
});

// Import database with data
const data = new Uint8Array(arrayBuffer); // Existing .db file data
const sqliteManager = await SQLiteManager.initialize(data, options);
```

#### API Reference

| Method | Parameters | Return Value | Description |
|--------|-----------|--------|------|
| `SQLiteManager.initialize(data, options)` | `data`: Uint8Array (optional)<br>`options`: Object | `Promise<SQLiteManager>` | Initialize SQLite instance. Specify DB content with data |
| `db.exec(sql, bind)` | `sql`: string<br>`bind`: Object (optional) | `Array<{columns, values}>` | Execute SQL and retrieve results |
| `splitStatements(sql)` | `sql`: string | `Array<string>` | Split SQL statements by semicolon |
| `executeQuery(query)` | `query`: string | `Array<{success, results, columns}>` | Execute query and return formatted results |
| `getDatabaseSchema()` | None | `{tables, views, indexes, triggers}` | Retrieve entire database schema information |
| `getTableStructure(tableName)` | `tableName`: string | `Array<Object>` | Retrieve column information of specified table |
| `export()` | None | `Uint8Array` | Export entire database as binary |
| `import(contents)` | `contents`: Uint8Array | `Promise<void>` | Import database (closes existing DB) |
| `close()` | None | `void` | Close database connection |

#### Usage Examples

```javascript
// Execute query
const results = sqliteManager.db.exec('SELECT * FROM users');
console.log(results[0].columns); // ['id', 'name']
console.log(results[0].values);  // [[1, 'Alice'], [2, 'Bob']]

// Get schema
const schema = sqliteManager.getDatabaseSchema();
console.log(schema.tables); // ['users', 'posts', ...]

// Get table structure
const structure = sqliteManager.getTableStructure('users');
// [{cid: 0, name: 'id', type: 'INTEGER', ...}, ...]

// Export database
const dbData = sqliteManager.export();
// Save to file or transfer to server

// Close
sqliteManager.close();
```

### Production Build

```bash
# Build for production (output to dist/ directory)
npm run build

# Check build results
ls dist/
# main.bundle.js, index.html, sqlite3.wasm, etc.
```

### Development Watch Mode

```bash
# Watch file changes and auto-rebuild
npm run dev
```

## Technical Details

### WebAssembly Initialization

SQLite-WebClient uses the official implementation of [@sqlite.org/sqlite-wasm](https://sqlite.org/wasm). Initialization process:

1. Load WASM module
2. Environment detection (browser/Node.js)
3. VFS (Virtual File System) setup
4. Database instance creation

### Custom Method Overrides

SQLiteManager class extends the original SQLite WASM API, providing a more user-friendly interface:

- **`db.prepare` override**: Add `getAsObject()` method to retrieve row data as objects
- **`db.exec` override**: Return results in unified `{columns, values}` format
- **Bind parameter filtering**: Auto-exclude unnecessary parameters

### Query Splitting

Uses `dbgate-query-splitter` to accurately split multiple SQL statements:

```javascript
const statements = sqliteManager.splitStatements(`
  CREATE TABLE test (id INT);
  INSERT INTO test VALUES (1);
  SELECT * FROM test;
`);
// ['CREATE TABLE test (id INT)', 'INSERT INTO test VALUES (1)', 'SELECT * FROM test']
```

## Current Status

### ✅ Implemented
- SQLite WASM initialization
- Basic SQL operations (CRUD)
- Database import/export
- Schema information retrieval
- Query splitting and sequential execution
- Cross-platform support (browser/Node.js)

### 🔧 Future Enhancements
- Custom function registration capability (implementation commented in code)
- Advanced UI features (syntax highlighting, autocomplete)
- Query history persistence
- Simultaneous management of multiple databases

## Performance and Limitations

### Advantages
- ✅ **Complete Client-Side**: All processing happens in the browser
- ✅ **Server-Free**: No backend infrastructure needed
- ✅ **Privacy Protection**: Data never sent to server
- ✅ **Offline Operation**: Works without network connection
- ✅ **Lightweight**: Minimal dependencies and small bundle size

### Limitations
- ⚠️ **Browser Memory Dependent**: Not suitable for processing large datasets (hundreds of MB+)
- ⚠️ **WebAssembly Required**: Won't work on older browsers (IE11 etc.)
- ⚠️ **Persistence Limitation**: In-memory data lost on page reload (export required)
- ⚠️ **File System Access Restricted**: Browser security constraints limit file operations

### Recommended Environment
- Chrome/Edge 89+
- Firefox 89+
- Safari 14.1+

## License

MIT License

Copyright (c) 2021 nojaja

See [LICENSE](LICENSE) file for details.

## Author

**nojaja**
- GitHub: [@nojaja](https://github.com/nojaja)
- Email: free.riccia@gmail.com

## Related Links

- [Official Live Demo](https://nojaja.github.io/SQLite-WebClient/)
- [SQLite WASM Official Documentation](https://sqlite.org/wasm/doc/trunk/index.md)
- [Repository](https://github.com/nojaja/SQLite-WebClient)

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const jsonDbPath = path.join(__dirname, 'database.json');
const sqliteDbPath = path.join(__dirname, 'database.db');

console.log('Iniciando migración de datos...');

if (!fs.existsSync(jsonDbPath)) {
  console.error(`Error: No se encontró el archivo JSON en: ${jsonDbPath}`);
  process.exit(1);
}

try {
  // 1. Read JSON database
  const jsonContent = fs.readFileSync(jsonDbPath, 'utf8');
  const dbData = JSON.parse(jsonContent);

  // 2. Initialize SQLite database
  const db = new DatabaseSync(sqliteDbPath);

  // 3. Create table
  db.exec(`
    CREATE TABLE IF NOT EXISTS businesses (
      id TEXT PRIMARY KEY,
      password TEXT NOT NULL,
      isSuperAdmin INTEGER DEFAULT 0,
      theme TEXT,
      info TEXT,
      features TEXT,
      carouselImages TEXT,
      products TEXT,
      reviews TEXT,
      videos TEXT
    )
  `);

  console.log('Tabla "businesses" verificada/creada en SQLite.');

  // 4. Prepare insert statement
  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO businesses (id, password, isSuperAdmin, theme, info, features, carouselImages, products, reviews, videos)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // 5. Migrate records
  let count = 0;
  for (const [id, value] of Object.entries(dbData)) {
    const isSuperAdmin = value.isSuperAdmin ? 1 : 0;
    
    insertStmt.run(
      id,
      value.password,
      isSuperAdmin,
      JSON.stringify(value.theme || {}),
      JSON.stringify(value.info || {}),
      JSON.stringify(value.features || []),
      JSON.stringify(value.carouselImages || []),
      JSON.stringify(value.products || []),
      JSON.stringify(value.reviews || []),
      JSON.stringify(value.videos || [])
    );
    count++;
    console.log(`Migrado negocio: ${id}`);
  }

  console.log(`\n¡Éxito! Se migraron ${count} cuentas correctamente.`);

  // 6. Backup original JSON file
  const backupPath = jsonDbPath + '.bak';
  fs.renameSync(jsonDbPath, backupPath);
  console.log(`Archivo original de base de datos JSON renombrado a: ${backupPath}`);

} catch (error) {
  console.error('Error durante la migración:', error);
  process.exit(1);
}

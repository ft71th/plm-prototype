#!/usr/bin/env node

/**
 * PLM CRA → Vite Migration Script
 * 
 * Kör: node migrate-to-vite.cjs
 * 
 * Scriptet gör följande:
 * 1. Säkerhetskopierar package.json
 * 2. Söker igenom src/ efter REACT_APP_ och konverterar till VITE_
 * 3. Konverterar .env-filer
 * 4. Identifierar potentiella problem
 * 5. Genererar en rapport
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const LOG = [];
const WARNINGS = [];
const ACTIONS = [];

function log(msg) {
  console.log(`  ${msg}`);
  LOG.push(msg);
}

function warn(msg) {
  console.log(`  ⚠️  ${msg}`);
  WARNINGS.push(msg);
}

function action(msg) {
  console.log(`  ✅ ${msg}`);
  ACTIONS.push(msg);
}

// ─────────────────────────────────────────────
// 1. Kontrollera att vi är i rätt katalog
// ─────────────────────────────────────────────
function checkProject() {
  console.log('\n📋 Steg 1: Kontrollerar projekt...\n');

  const pkgPath = path.join(ROOT, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    console.error('❌ Ingen package.json hittad. Kör scriptet från projektroten.');
    process.exit(1);
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  if (!pkg.dependencies?.['react-scripts'] && !pkg.devDependencies?.['react-scripts']) {
    warn('react-scripts hittades inte i dependencies. Kanske redan migrerat?');
  } else {
    log('react-scripts hittad — redo för migration.');
  }

  // Backup
  const backupPath = path.join(ROOT, 'package.json.backup');
  fs.copyFileSync(pkgPath, backupPath);
  action('Säkerhetskopia skapad: package.json.backup');

  return pkg;
}

// ─────────────────────────────────────────────
// 2. Sök och ersätt REACT_APP_ → VITE_
// ─────────────────────────────────────────────
function migrateEnvVars() {
  console.log('\n📋 Steg 2: Migrerar miljövariabler...\n');

  const srcDir = path.join(ROOT, 'src');
  if (!fs.existsSync(srcDir)) {
    warn('Ingen src/ katalog hittad.');
    return;
  }

  let filesChanged = 0;
  let replacements = 0;

  function walkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== 'node_modules') {
        walkDir(fullPath);
      } else if (entry.isFile() && /\.(js|jsx|ts|tsx|mjs)$/.test(entry.name)) {
        let content = fs.readFileSync(fullPath, 'utf8');
        const original = content;

        // process.env.REACT_APP_XXX → import.meta.env.VITE_XXX
        const regex = /process\.env\.REACT_APP_(\w+)/g;
        const matches = content.match(regex);

        if (matches) {
          content = content.replace(regex, 'import.meta.env.VITE_$1');
          fs.writeFileSync(fullPath, content, 'utf8');
          const relPath = path.relative(ROOT, fullPath);
          action(`${relPath}: ${matches.length} ersättning(ar)`);
          filesChanged++;
          replacements += matches.length;
        }

        // Kolla efter process.env.NODE_ENV (funkar i Vite men bra att veta)
        if (content.includes('process.env.NODE_ENV')) {
          const relPath = path.relative(ROOT, fullPath);
          warn(`${relPath}: Använder process.env.NODE_ENV — ersätt med import.meta.env.MODE`);
        }

        // Kolla efter process.env.PUBLIC_URL
        if (content.includes('process.env.PUBLIC_URL')) {
          const relPath = path.relative(ROOT, fullPath);
          warn(`${relPath}: Använder process.env.PUBLIC_URL — ta bort (Vite hanterar detta automatiskt)`);
        }
      }
    }
  }

  walkDir(srcDir);
  log(`Totalt: ${replacements} ersättningar i ${filesChanged} filer.`);

  // Konvertera .env-filer
  const envFiles = ['.env', '.env.local', '.env.development', '.env.production'];
  for (const envFile of envFiles) {
    const envPath = path.join(ROOT, envFile);
    if (fs.existsSync(envPath)) {
      let content = fs.readFileSync(envPath, 'utf8');
      const original = content;
      content = content.replace(/^REACT_APP_/gm, 'VITE_');
      if (content !== original) {
        // Backup
        fs.copyFileSync(envPath, envPath + '.backup');
        fs.writeFileSync(envPath, content, 'utf8');
        action(`${envFile}: Konverterad (backup: ${envFile}.backup)`);
      }
    }
  }
}

// ─────────────────────────────────────────────
// 3. Kontrollera importmönster
// ─────────────────────────────────────────────
function checkImports() {
  console.log('\n📋 Steg 3: Kontrollerar importmönster...\n');

  const srcDir = path.join(ROOT, 'src');
  if (!fs.existsSync(srcDir)) return;

  const issues = [];

  function walkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== 'node_modules') {
        walkDir(fullPath);
      } else if (entry.isFile() && /\.(js|jsx|ts|tsx)$/.test(entry.name)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const relPath = path.relative(ROOT, fullPath);

        // CRA-specifika importer
        if (content.includes("from 'react-scripts")) {
          warn(`${relPath}: Importerar från react-scripts — måste tas bort manuellt`);
        }

        // SVG som React-komponent (CRA-specifikt)
        if (content.match(/import.*\.svg.*ReactComponent/)) {
          warn(`${relPath}: SVG som ReactComponent — installera vite-plugin-svgr`);
        }

        // Require() calls som kan strula med Vite
        const requireMatches = content.match(/require\(['"]/g);
        if (requireMatches && requireMatches.length > 0) {
          warn(`${relPath}: ${requireMatches.length} require() — fungerar oftast men verifiera`);
        }
      }
    }
  }

  walkDir(srcDir);
}

// ─────────────────────────────────────────────
// 4. Kontrollera index.html
// ─────────────────────────────────────────────
function checkIndexHtml() {
  console.log('\n📋 Steg 4: Kontrollerar index.html...\n');

  const publicIndex = path.join(ROOT, 'public', 'index.html');
  const rootIndex = path.join(ROOT, 'index.html');

  if (fs.existsSync(rootIndex)) {
    log('index.html finns redan i roten — kontrollera att den har <script type="module"> tag');
  } else if (fs.existsSync(publicIndex)) {
    // Läs befintlig och migrera
    let content = fs.readFileSync(publicIndex, 'utf8');

    // Ta bort %PUBLIC_URL%
    content = content.replace(/%PUBLIC_URL%\//g, '/');

    // Lägg till Vite entry point före </body>
    if (!content.includes('type="module"')) {
      content = content.replace(
        '</body>',
        '    <script type="module" src="/src/index.jsx"></script>\n  </body>'
      );
    }

    fs.writeFileSync(rootIndex, content, 'utf8');
    action('index.html kopierad till roten och uppdaterad för Vite');
    warn('Kontrollera att src="/src/index.jsx" matchar din faktiska entry point');
  } else {
    warn('Ingen index.html hittad — använd den medföljande index.html');
  }
}

// ─────────────────────────────────────────────
// 5. Uppdatera package.json
// ─────────────────────────────────────────────
function updatePackageJson(pkg) {
  console.log('\n📋 Steg 5: Uppdaterar package.json...\n');

  // Uppdatera scripts
  pkg.scripts = pkg.scripts || {};
  const oldScripts = { ...pkg.scripts };

  pkg.scripts.start = 'vite';
  pkg.scripts.build = 'vite build';
  pkg.scripts.preview = 'vite preview';

  // Behåll eventuella custom scripts
  if (oldScripts.test) pkg.scripts.test = oldScripts.test;
  if (oldScripts.lint) pkg.scripts.lint = oldScripts.lint;
  if (oldScripts.eject) delete pkg.scripts.eject; // Inte relevant för Vite

  action('Scripts uppdaterade: start → vite, build → vite build');

  // Ta bort react-scripts från dependencies
  if (pkg.dependencies?.['react-scripts']) {
    delete pkg.dependencies['react-scripts'];
    action('react-scripts borttagen från dependencies');
  }
  if (pkg.devDependencies?.['react-scripts']) {
    delete pkg.devDependencies['react-scripts'];
    action('react-scripts borttagen från devDependencies');
  }

  // Ta bort CRA-specifika fält
  if (pkg.eslintConfig?.extends?.includes('react-app')) {
    delete pkg.eslintConfig;
    action('CRA eslintConfig borttagen');
  }

  // Lägg till browserslist som stödjer moderna browsers
  pkg.browserslist = undefined;
  action('CRA browserslist borttagen (Vite hanterar targets via config)');

  // Spara
  fs.writeFileSync(
    path.join(ROOT, 'package.json'),
    JSON.stringify(pkg, null, 2) + '\n',
    'utf8'
  );
  action('package.json sparad');
}

// ─────────────────────────────────────────────
// 6. Generera rapport
// ─────────────────────────────────────────────
function generateReport() {
  console.log('\n' + '═'.repeat(60));
  console.log('  📊 MIGRATIONSRAPPORT');
  console.log('═'.repeat(60));

  console.log(`\n  ✅ Genomförda åtgärder: ${ACTIONS.length}`);
  ACTIONS.forEach(a => console.log(`     • ${a}`));

  if (WARNINGS.length > 0) {
    console.log(`\n  ⚠️  Varningar (kräver manuell åtgärd): ${WARNINGS.length}`);
    WARNINGS.forEach(w => console.log(`     • ${w}`));
  }

  console.log('\n  📝 NÄSTA STEG:');
  console.log('     1. Installera Vite:');
  console.log('        npm install -D vite @vitejs/plugin-react');
  console.log('');
  console.log('     2. Om SVG-som-komponent varningar:');
  console.log('        npm install -D vite-plugin-svgr');
  console.log('');
  console.log('     3. Kopiera vite.config.js till projektroten');
  console.log('');
  console.log('     4. Starta:');
  console.log('        npm start');
  console.log('');
  console.log('     5. Verifiera att allt fungerar');
  console.log('');
  console.log('     6. Rensa:');
  console.log('        rm package.json.backup .env*.backup');
  console.log('');
  console.log('═'.repeat(60));
  console.log('  🎉 Migration klar! Ingen backend-data har påverkats.');
  console.log('═'.repeat(60) + '\n');
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────
console.log('\n🚀 PLM Vite Migration Tool');
console.log('═'.repeat(60));

const pkg = checkProject();
migrateEnvVars();
checkImports();
checkIndexHtml();
updatePackageJson(pkg);
generateReport();

// Lance Vitest depuis le chemin exact du projet : `npm test` (voir GUIDE_FIABILITE.md).
// Sous Windows, un terminal ouvert dans « c:\… » (lettre du lecteur en minuscule, fréquent dans VS Code)
// fait charger Vitest en double : tous les tests échouent alors avec « Vitest failed to find the runner ».
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fs.realpathSync.native(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
const vitest = path.join(root, 'node_modules', 'vitest', 'vitest.mjs');

const { status } = spawnSync(process.execPath, [vitest, ...process.argv.slice(2)], { cwd: root, stdio: 'inherit' });
process.exit(status ?? 1);

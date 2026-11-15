// Every task scene (src/cenas/*Tarefa.ts that extends Phaser.Scene) must be reachable in the game: some list
// of the game has to name it (room tasks, events, ship stations, equipment, expeditions, energy pickups...).
// A scene that is only registered in main.ts is an orphan: it exists but never shows up.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const raiz = join(import.meta.dirname, '..');

function arquivos(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => d.isDirectory() ? arquivos(join(dir, d.name)) : [join(dir, d.name)]);
}

test('no task scene is an orphan (registered but never chosen by the game)', () => {
  const fontes = arquivos(raiz).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'));
  const cenas = readdirSync(join(raiz, 'cenas'))
    .filter((f) => /^[A-Z]\w*Tarefa\.ts$/.test(f))
    .map((f) => f.replace(/\.ts$/, ''))
    .filter((nome) => readFileSync(join(raiz, 'cenas', `${nome}.ts`), 'utf8').includes('extends Phaser.Scene'));
  assert.ok(cenas.length > 20, 'expected the task scenes to be found');
  const orfas = cenas.filter((nome) => {
    const proprio = join(raiz, 'cenas', `${nome}.ts`), main = join(raiz, 'main.ts');
    return !fontes.some((f) => f !== proprio && f !== main && readFileSync(f, 'utf8').includes(`'${nome}'`));
  });
  assert.deepEqual(orfas, [], `these task scenes are never chosen by any list: ${orfas.join(', ')}`);
});

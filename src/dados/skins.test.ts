import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { SKINS,SKINS_SPRITES,SKIN_PADRAO,skinUsaProcedural,skinBase,chaveSkin,chaveSkinCarga,chaveSkinSentado,arquivoSkinCarga,arquivoSentado } from './skins.ts';
test('procedural character is a separate selectable skin while the six original suits remain unchanged',()=>{
  assert.equal(SKIN_PADRAO,'comandante');assert.equal(SKINS.length,7);assert.equal(SKINS_SPRITES.length,6);
  assert.equal(SKINS.find(s=>s.id==='procedural')?.nome,'Explorer 3D');assert.equal(skinUsaProcedural('procedural'),true);
  for(const s of SKINS_SPRITES)assert.equal(skinUsaProcedural(s.id),false);
});
test('procedural uses existing Commander assets for every fallback pose and creates no duplicate loader keys',()=>{
  assert.equal(skinBase('procedural').id,'comandante');assert.equal(skinBase('unknown').id,'comandante');
  assert.equal(chaveSkin('procedural'),chaveSkin('comandante'));
  assert.equal(chaveSkinCarga('procedural'),chaveSkinCarga('comandante'));
  assert.equal(chaveSkinSentado('procedural'),chaveSkinSentado('comandante'));
  assert.equal(arquivoSkinCarga('procedural'),'lua/astronaut_carga_comandante.png');
  assert.equal(new Set(SKINS_SPRITES.map(s=>chaveSkin(s.id))).size,SKINS_SPRITES.length);
  for(const s of SKINS_SPRITES)for(const f of [s.arquivo,arquivoSkinCarga(s.id),arquivoSentado(s.arquivo)])assert.ok(existsSync(new URL('../../public/'+f,import.meta.url)),f);
});

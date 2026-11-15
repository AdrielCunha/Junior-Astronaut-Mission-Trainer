import { spawnSync } from 'node:child_process';
import { cpSync } from 'node:fs';
const result=spawnSync('node_modules/.bin/vite',['build','--config','vite.lab.config.ts'],{stdio:'inherit'});
if(result.status!==0)process.exit(result.status??1);
cpSync('public/lab','dist-lab/lab',{recursive:true});

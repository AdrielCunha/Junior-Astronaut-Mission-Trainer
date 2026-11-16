// Repository About metadata. Requires an authenticated GitHub CLI with repo access.
// node tools/dev/configurar_repositorio.mjs          preview against current metadata
// node tools/dev/configurar_repositorio.mjs --apply  apply the requested changes
import { execFileSync } from 'node:child_process';
const repo = 'AdrielCunha/Junior-Astronaut-Mission-Trainer';
const homepage = 'https://lunarodyssey.earth';
const description = 'An educational space exploration game built with Phaser and TypeScript for NASA Space Apps.';
const topics = ['educational-game', 'phaser', 'typescript', 'vite', 'nasa-space-apps', 'space-exploration', 'moon', 'mars'];
const gh = args => execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
try {
  const current = JSON.parse(gh(['repo', 'view', repo, '--json', 'description,homepageUrl,repositoryTopics']));
  const existing = new Set((current.repositoryTopics ?? []).map(t => t.name));
  const additions = topics.filter(t => !existing.has(t));
  const args = ['repo', 'edit', repo];
  if (current.homepageUrl !== homepage) args.push('--homepage', homepage);
  if (!current.description?.trim()) args.push('--description', description);
  for (const topic of additions) args.push('--add-topic', topic);
  console.log(JSON.stringify({ repository: repo, homepage, description: current.description?.trim() ? 'preserve existing description' : description, topicsToAdd: additions }, null, 2));
  if (!process.argv.includes('--apply')) console.log('Preview only. Use --apply to update GitHub.');
  else if (args.length === 3) console.log('Repository metadata is already configured.');
  else {
    gh(args);
    console.log('GitHub repository metadata updated.');
  }
} catch (error) {
  console.error('Could not read or update GitHub repository metadata. Check network access and gh authentication.');
  if (error.stderr) console.error(String(error.stderr).trim());
  process.exitCode = 1;
}

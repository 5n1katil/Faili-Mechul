import { execFileSync } from 'node:child_process';
export function api(endpoint, method = 'GET', body) {
  if (method !== 'GET' && !(method === 'POST' &&
      (/^repos\/5n1katil\/Faili-Mechul\/pulls$/.test(endpoint) ||
       endpoint === 'repos/5n1katil/Faili-Mechul/actions/workflows/fm-case-pipeline.yml/dispatches')))
    throw new Error('GITHUB_MUTATION_NOT_ALLOWED');
  const args = ['api', endpoint, '--method', method];
  if (body !== undefined) args.push('--input', '-');
  const raw = execFileSync('gh', args, { encoding: 'utf8', input: body === undefined ? undefined : JSON.stringify(body),
    stdio: ['pipe', 'pipe', 'pipe'], timeout: 60000 });
  return raw.trim() ? JSON.parse(raw) : null;
}

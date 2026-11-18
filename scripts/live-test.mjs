import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const { Gradium } = require('../dist/nodes/Gradium/Gradium.node.js');
const key = process.env.GRADIUM_API_KEY;
if (!key) throw new Error('Set GRADIUM_API_KEY');
const output = process.env.GRADIUM_AUDIO_PATH || '/Users/khmuhtadin/.aside/u/0/sessions/2026-11-18_AgNL0rcpq9xnTpw1/tmp/gradium-test.wav';
async function request(keyValue, opts) {
 const url = new URL(opts.url);
 for (const [k,v] of Object.entries(opts.qs || {})) url.searchParams.set(k, String(v));
 const response = await fetch(url, { method: opts.method, headers: { 'x-api-key': keyValue, ...opts.headers }, body: opts.body });
 if (!response.ok) throw new Error(`HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
 if (opts.encoding === 'arraybuffer') return Buffer.from(await response.arrayBuffer());
 return opts.json === false ? await response.text() : await response.json();
}
async function execute(params, audio) {
 const ctx = { getInputData: () => [{json:{},binary:{}}], getNodeParameter: n => params[n], getNode: () => ({name:'Gradium'}), continueOnFail: () => false,
  helpers: { httpRequestWithAuthentication: async (_credential, opts) => request(key,opts), getBinaryDataBuffer: async () => audio, prepareBinaryData: async (b,f,m) => ({ data:b.toString('base64'), fileName:f, mimeType:m }) } };
 return (await new Gradium().execute.call(ctx))[0];
}
const creds = {method:'GET',url:'https://api.gradium.ai/api/usages/credits',json:true};
const credits = await request(key,creds); console.log('Credential valid: PASS; credits:',JSON.stringify(credits));
try { await request('invalid-key',creds); throw new Error('Bogus key unexpectedly succeeded'); } catch(e) { if (!/HTTP (401|403)/.test(e.message)) throw e; console.log('Credential invalid: PASS',e.message.match(/HTTP \d+/)[0]); }
const voices = await execute({operation:'voices',includeCatalog:true,limit:10,skip:0});
if (!voices.length || !voices[0].json.uid) throw new Error('Voice list is empty or malformed'); console.log('List voices: PASS; count:', voices.length);
const voiceId = process.env.GRADIUM_VOICE_ID || '4SZHfMpw-p46Ywgs';
const voice = await execute({operation:'getVoice',voiceId}); if (voice[0].json.uid !== voiceId) throw new Error('Unexpected voice'); console.log('Get voice: PASS;',voice[0].json.name);
const tts = await execute({operation:'tts',text:'Hello, this is a short speech test.',voiceId,format:'wav',outputBinary:'data'});
const audio = Buffer.from(tts[0].binary.data.data,'base64'); await writeFile(output,audio);
console.log('TTS bytes:',audio.length,'saved:',output);
console.log('ffprobe:',execFileSync('/opt/homebrew/bin/ffprobe',['-v','error','-show_entries','format=format_name,duration','-of','json',output],{encoding:'utf8'}));
const asr = await execute({operation:'asr',inputFormat:'wav',inputBinary:'data',language:'en'},audio); if (!asr[0].json.text.toLowerCase().includes('speech test')) throw new Error('Unexpected transcription'); console.log('STT: PASS;',asr[0].json.text);
const result = await execute({operation:'credits'}); console.log('Get credits:',JSON.stringify(result[0].json));

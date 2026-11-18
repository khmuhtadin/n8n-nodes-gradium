import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { Gradium } = require('../dist/nodes/Gradium/Gradium.node.js');
const { GradiumApi } = require('../dist/credentials/GradiumApi.credentials.js');
async function run(params, response, items = [{json:{source:'original'},binary:{data:{}}}]) {
 const calls=[]; const ctx={getInputData:()=>items,getNodeParameter:(n)=>params[n],getNode:()=>({name:'Gradium'}),continueOnFail:()=>false,helpers:{httpRequestWithAuthentication:async(c,r)=>{calls.push({c,...r});return response;},getBinaryDataBuffer:async()=>Buffer.from('audio'),prepareBinaryData:async(b,f,m)=>({data:b.toString('base64'),fileName:f,mimeType:m})}};
 return { result: await new Gradium().execute.call(ctx), calls };
}
test('credential tests authenticated credits',()=>{const c=new GradiumApi();assert.equal(c.test.request.url,'/usages/credits');assert.ok(c.authenticate.properties.headers['x-api-key']);});
test('TTS requests raw bytes at correct OpenAPI path and stores binary',async()=>{const {result,calls}=await run({operation:'tts',text:'hello',voiceId:'v',format:'wav',outputBinary:'audio'},Buffer.from('wav'));assert.equal(calls[0].url,'https://api.gradium.ai/api/speech/tts');assert.deepEqual(JSON.parse(calls[0].body),{text:'hello',voice_id:'v',output_format:'wav',only_audio:true});assert.equal(result[0][0].binary.audio.data,Buffer.from('wav').toString('base64'));});
test('ASR sends raw binary and parses NDJSON',async()=>{const {calls,result}=await run({operation:'asr',inputFormat:'wav',inputBinary:'data',language:'en'},'{"type":"text","text":"hello"}\n{"type":"end_text"}\n');assert.equal(calls[0].url,'https://api.gradium.ai/api/speech/asr');assert.equal(calls[0].body.toString(),'audio');assert.equal(calls[0].qs.json_config,'{"language":"en"}');assert.equal(result[0][0].json.text,'hello');});
test('ASR surfaces stream errors',async()=>{await assert.rejects(run({operation:'asr',inputFormat:'wav',inputBinary:'data',language:'en'},'{"type":"error","message":"bad"}\n'),/transcription error/);});
test('list voices passes pagination and catalog',async()=>{const {result,calls}=await run({operation:'voices',includeCatalog:true,limit:10,skip:2},[{uid:'v',name:'Harper',is_catalog:true}]);assert.equal(calls[0].url,'https://api.gradium.ai/api/voices/');assert.deepEqual(calls[0].qs,{include_catalog:true,limit:10,skip:2});assert.equal(result[0][0].json.uid,'v');});
test('get voice safely encodes ID',async()=>{const {calls}=await run({operation:'getVoice',voiceId:'a/b'},{uid:'a/b',name:'Harper'});assert.equal(calls[0].url,'https://api.gradium.ai/api/voices/a%2Fb');});
test('get credits',async()=>{const {calls,result}=await run({operation:'credits'},{remaining_credits:44965,allocated_credits:45000,billing_period:'11-2026'});assert.equal(calls[0].url,'https://api.gradium.ai/api/usages/credits');assert.equal(result[0][0].json.remaining_credits,44965);});

test('ASR joins real word chunks with spaces',async()=>{const stream=[{type:'ready'},{type:'text',text:'hello'},{type:'text',text:'this'},{type:'text',text:'is a'},{type:'text',text:'short'},{type:'text',text:'speech'},{type:'text',text:'test'},{type:'end_text'}].map(JSON.stringify).join('\n');const {result}=await run({operation:'asr',inputFormat:'wav',inputBinary:'data',language:'en'},stream);assert.equal(result[0][0].json.text,'hello this is a short speech test');});

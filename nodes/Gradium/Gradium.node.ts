import type { IDataObject, IExecuteFunctions, IHttpRequestOptions, INodeExecutionData, INodeProperties, INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

const show = (operation: string) => ({ operation: [operation] });
const properties: INodeProperties[] = [
 { displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true, options: [
  { name: 'Get Credits', value: 'credits', action: 'Get credits' },
  { name: 'Get Voice', value: 'getVoice', action: 'Get a voice' },
  { name: 'List Voices', value: 'voices', action: 'List voices' },
  { name: 'Speech to Text', value: 'asr', action: 'Transcribe audio' },
  { name: 'Text to Speech', value: 'tts', action: 'Generate audio' },
 ], default: 'tts' },
 { displayName: 'Text', name: 'text', type: 'string', typeOptions: { rows: 4 }, default: '', required: true, displayOptions: { show: show('tts') } },
 { displayName: 'Voice ID', name: 'voiceId', type: 'string', default: '', required: true, displayOptions: { show: { operation: ['tts', 'getVoice'] } } },
 { displayName: 'Output Format', name: 'format', type: 'options', options: [{ name: 'A-Law 8 kHz', value: 'alaw_8000' }, { name: 'Opus', value: 'opus' }, { name: 'PCM', value: 'pcm' }, { name: 'PCM 16000 Hz', value: 'pcm_16000' }, { name: 'PCM 22050 Hz', value: 'pcm_22050' }, { name: 'PCM 24000 Hz', value: 'pcm_24000' }, { name: 'PCM 44100 Hz', value: 'pcm_44100' }, { name: 'PCM 48000 Hz', value: 'pcm_48000' }, { name: 'PCM 8000 Hz', value: 'pcm_8000' }, { name: 'WAV', value: 'wav' }, { name: 'μ-Law 8 kHz', value: 'ulaw_8000' } ], default: 'wav', displayOptions: { show: show('tts') } },
 { displayName: 'Output Binary Property', name: 'outputBinary', type: 'string', default: 'data', required: true, displayOptions: { show: show('tts') } },
 { displayName: 'Input Binary Property', name: 'inputBinary', type: 'string', default: 'data', required: true, displayOptions: { show: show('asr') } },
 { displayName: 'Audio Format', name: 'inputFormat', type: 'options', options: [{ name: 'WAV', value: 'wav' }, { name: 'PCM (24 kHz, 16-Bit Mono)', value: 'pcm' }, { name: 'Ogg Opus', value: 'opus' }], default: 'wav', displayOptions: { show: show('asr') } },
 { displayName: 'Language', name: 'language', type: 'string', default: 'any', required: true, description: 'Language code, such as en, or any for auto-detection', displayOptions: { show: show('asr') } },
 { displayName: 'Include Catalog', name: 'includeCatalog', type: 'boolean', default: true, displayOptions: { show: show('voices') } },
 { displayName: 'Limit', name: 'limit', type: 'number',
																																								description: 'Max number of results to return', default: 50, typeOptions: { minValue: 1 }, displayOptions: { show: show('voices') } },
 { displayName: 'Skip', name: 'skip', type: 'number', default: 0, typeOptions: { minValue: 0 }, displayOptions: { show: show('voices') } },
];
export class Gradium implements INodeType {
 description: INodeTypeDescription = { displayName: 'Gradium', name: 'gradium', icon: { light: 'file:../../icons/gradium.svg', dark: 'file:../../icons/gradium.dark.svg' }, group: ['transform'], version: 1, subtitle: '={{$parameter.operation}}', description: 'Generate and transcribe speech with Gradium', defaults: { name: 'Gradium' }, inputs: [NodeConnectionTypes.Main], outputs: [NodeConnectionTypes.Main], usableAsTool: true, credentials: [{ name: 'gradiumApi', required: true }], properties };
 async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  const items = this.getInputData(); const out: INodeExecutionData[] = [];
  for (let i = 0; i < items.length; i++) {
   try {
    const op = this.getNodeParameter('operation', i) as string;
    const req: IHttpRequestOptions = { method: 'GET', url: 'https://api.gradium.ai/api', json: true };
    if (op === 'tts') {
     // https://docs.gradium.ai/api-reference/endpoint/tts-post; OpenAPI path is /speech/tts.
     const format = this.getNodeParameter('format', i) as string;
     req.method = 'POST'; req.url += '/speech/tts'; req.body = { text: this.getNodeParameter('text', i), voice_id: this.getNodeParameter('voiceId', i), output_format: format, only_audio: true }; req.encoding = 'arraybuffer'; req.json = false; req.headers = { 'Content-Type': 'application/json' }; req.body = JSON.stringify(req.body);
     const bytes = await this.helpers.httpRequestWithAuthentication.call(this, 'gradiumApi', req) as Buffer;
     const prop = this.getNodeParameter('outputBinary', i) as string;
     const mime = format === 'wav' ? 'audio/wav' : format === 'opus' ? 'audio/ogg' : 'application/octet-stream';
     const binary = await this.helpers.prepareBinaryData(Buffer.from(bytes), `speech.${format === 'opus' ? 'ogg' : format}`, mime);
     out.push({ json: { ...items[i].json }, binary: { ...items[i].binary, [prop]: binary }, pairedItem: { item: i } }); continue;
    }
    if (op === 'asr') {
     // https://docs.gradium.ai/api-reference/endpoint/stt-post
     const format = this.getNodeParameter('inputFormat', i) as string;
     const binaryName = this.getNodeParameter('inputBinary', i) as string;
     req.method = 'POST'; req.url += '/speech/asr'; req.json = false; req.body = await this.helpers.getBinaryDataBuffer(i, binaryName); req.headers = { 'Content-Type': format === 'opus' ? 'audio/ogg' : `audio/${format}` }; req.qs = { json_config: JSON.stringify({ language: this.getNodeParameter('language', i) }) };
     const response = await this.helpers.httpRequestWithAuthentication.call(this, 'gradiumApi', req) as string;
     const messages = String(response).split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line) as IDataObject);
     const failure = messages.find(m => m.type === 'error'); if (failure) throw new NodeOperationError(this.getNode(), `Gradium transcription error: ${JSON.stringify(failure)}`, { itemIndex: i });
     out.push({ json: { text: messages.filter(m => m.type === 'text').map(m => String(m.text ?? '').trim()).filter(Boolean).join(' '), messages }, pairedItem: { item: i } }); continue;
    }
    if (op === 'voices') { // https://docs.gradium.ai/api-reference/openapi.json#/paths/~1voices~1/get
     req.url += '/voices/'; req.qs = { include_catalog: this.getNodeParameter('includeCatalog', i), limit: this.getNodeParameter('limit', i), skip: this.getNodeParameter('skip', i) };
    } else if (op === 'getVoice') { // https://docs.gradium.ai/api-reference/openapi.json#/paths/~1voices~1%7Bvoice_uid%7D/get
     req.url += `/voices/${encodeURIComponent(this.getNodeParameter('voiceId', i) as string)}`;
    } else if (op === 'credits') { // https://docs.gradium.ai/api-reference/endpoint/get-credits
     req.url += '/usages/credits';
    } else throw new NodeOperationError(this.getNode(), `Unknown operation: ${op}`, { itemIndex: i });
    const response = await this.helpers.httpRequestWithAuthentication.call(this, 'gradiumApi', req) as IDataObject | IDataObject[];
    for (const row of Array.isArray(response) ? response : [response]) out.push({ json: row, pairedItem: { item: i } });
   } catch (error) { if (!this.continueOnFail()) throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i }); out.push({ json: { error: (error as Error).message }, pairedItem: { item: i } }); }
  }
  return [out];
 }
}

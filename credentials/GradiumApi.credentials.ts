import type { IAuthenticateGeneric, Icon, ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

export class GradiumApi implements ICredentialType {
 icon: Icon = { light: 'file:../icons/gradium.svg', dark: 'file:../icons/gradium.dark.svg' };
 name = 'gradiumApi';
 displayName = 'Gradium API';
 documentationUrl = 'https://docs.gradium.ai/api-reference/introduction';
 properties: INodeProperties[] = [{ displayName: 'API Key', name: 'apiKey', type: 'string', typeOptions: { password: true }, default: '', required: true }];
 authenticate: IAuthenticateGeneric = { type: 'generic', properties: { headers: { 'x-api-key': '={{$credentials.apiKey}}' } } };
 // https://docs.gradium.ai/api-reference/endpoint/get-credits
 test: ICredentialTestRequest = { request: { baseURL: 'https://api.gradium.ai/api', url: '/usages/credits', method: 'GET' } };
}

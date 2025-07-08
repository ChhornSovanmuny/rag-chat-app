import type { NextApiRequest, NextApiResponse } from 'next';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('=== Test API called ===');
  
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  
  const result = {
    timestamp: new Date().toISOString(),
    env_vars: {
      GOOGLE_APPLICATION_CREDENTIALS: keyFile,
      WEAVIATE_ENDPOINT: process.env.WEAVIATE_ENDPOINT,
      WEAVIATE_API_KEY: process.env.WEAVIATE_API_KEY ? 'SET' : 'NOT SET',
      VERTEX_AI_LOCATION: process.env.VERTEX_AI_LOCATION,
      GOOGLE_CLOUD_PROJECT_ID: process.env.GOOGLE_CLOUD_PROJECT_ID,
    },
    file_check: {
      exists: keyFile ? fs.existsSync(keyFile) : false,
      path: keyFile,
    }
  };
  
  if (keyFile && fs.existsSync(keyFile)) {
    try {
      const key = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
      result.file_check = {
        ...result.file_check,
        client_email: key.client_email,
        project_id: key.project_id,
        private_key_exists: !!key.private_key,
      };
    } catch (error) {
      result.file_check = {
        ...result.file_check,
        parse_error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  console.log('Test result:', JSON.stringify(result, null, 2));
  res.status(200).json(result);
} 
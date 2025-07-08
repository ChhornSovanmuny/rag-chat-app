import type { NextApiRequest, NextApiResponse } from 'next';
import weaviate from 'weaviate-ts-client';
import dotenv from 'dotenv';

dotenv.config();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('=== Weaviate Check API called ===');
  
  try {
    const client = weaviate.client({
      scheme: 'https',
      host: process.env.WEAVIATE_ENDPOINT!,
      apiKey: new weaviate.ApiKey(process.env.WEAVIATE_API_KEY!),
    });

    console.log('Weaviate client created');
    console.log('Endpoint:', process.env.WEAVIATE_ENDPOINT);

    // スキーマの確認
    console.log('Checking schema...');
    const schema = await client.schema.getter().do();
    console.log('Schema:', JSON.stringify(schema, null, 2));

    // Documentクラスの確認
    const documentClass = schema.classes?.find((cls: { class?: string }) => (cls.class ?? '') === 'Document');
    console.log('Document class found:', !!documentClass);

    // 変数をifブロックの外で宣言
    let documentCount = 0;
    let sampleResult = null;

    if (documentClass) {
      // Documentクラスのデータ数を確認
      console.log('Checking document count...');
      let countResult = null;
      
      try {
        countResult = await client.graphql.aggregate()
          .withClassName('Document')
          .withFields('meta { count }')
          .do();
        
        documentCount = countResult.data.Aggregate.Document[0].meta.count;
        console.log('Document count:', documentCount);
      } catch (error) {
        console.error('Error getting document count:', error);
      }

      // サンプルデータの確認
      console.log('Checking sample documents...');
      sampleResult = await client.graphql.get()
        .withClassName('Document')
        .withFields('text')
        .withLimit(2)
        .do();
      
      console.log('Sample documents:', sampleResult.data.Get.Document.length);
      if (sampleResult.data.Get.Document.length > 0) {
        console.log('First document preview:', sampleResult.data.Get.Document[0].text.substring(0, 100) + '...');
      }
    }

    const result = {
      timestamp: new Date().toISOString(),
      connection: {
        endpoint: process.env.WEAVIATE_ENDPOINT,
        api_key_exists: !!process.env.WEAVIATE_API_KEY,
      },
      schema: {
        classes: schema.classes?.map((cls: { class?: string }) => cls.class ?? '') || [],
        document_class_exists: !!documentClass,
      },
      data: documentClass ? {
        total_documents: documentCount || 0,
        sample_documents: sampleResult?.data.Get.Document.length || 0,
      } : null,
    };

    console.log('Check result:', JSON.stringify(result, null, 2));
    res.status(200).json(result);

  } catch (error) {
    console.error('Weaviate check error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
} 
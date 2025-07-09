import type { NextApiRequest, NextApiResponse } from 'next';
import weaviate from 'weaviate-ts-client';
import dotenv from 'dotenv';
import { GoogleAuth } from 'google-auth-library';
import path from 'path';
import fs from 'fs';

dotenv.config();

console.log('=== Environment Variables Check ===');
console.log('GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS ? 'SET' : 'NOT SET');
console.log('WEAVIATE_ENDPOINT:', process.env.WEAVIATE_ENDPOINT);
console.log('WEAVIATE_API_KEY:', process.env.WEAVIATE_API_KEY ? 'SET' : 'NOT SET');
console.log('VERTEX_AI_LOCATION:', process.env.VERTEX_AI_LOCATION);
console.log('GOOGLE_CLOUD_PROJECT_ID:', process.env.GOOGLE_CLOUD_PROJECT_ID);

async function getAccessToken() {
  console.log('=== Service Account Check ===');
  
  let key;
  
  // Try to parse credentials from environment variable first
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      // Check if it's a JSON string (not a file path)
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS.trim().startsWith('{')) {
        console.log('Parsing credentials from environment variable JSON');
        key = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
      } else {
        // It's a file path
        console.log('Reading credentials from file path');
        const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        console.log('Key file path:', keyPath);
        
        const absolutePath = path.resolve(keyPath);
        console.log('File exists:', fs.existsSync(absolutePath));
        
        key = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
      }
    } catch (error) {
      console.error('Error parsing credentials:', error);
      throw new Error('Invalid Google Cloud credentials format');
    }
  } else {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS environment variable not set');
  }
  
  console.log('JSON parsed successfully');
  console.log('client_email:', key.client_email);
  console.log('project_id:', key.project_id);
  console.log('private_key length:', key.private_key ? key.private_key.length : 'NO KEY');
  
  const { JWT } = await import('google-auth-library');
  
  const client = new JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  
  console.log('=== JWT Client Created ===');
  console.log('Email:', key.client_email);
  console.log('Scopes:', ['https://www.googleapis.com/auth/cloud-platform']);
  
  try {
    // より詳細なエラーハンドリング
    const authResult = await client.authorize();
    console.log('=== Auth Result ===');
    console.log('Auth result type:', typeof authResult);
    console.log('Auth result keys:', Object.keys(authResult || {}));
    
    const authResultAny = authResult as unknown as { token?: string; access_token?: string };
    const token = authResultAny?.token || authResultAny?.access_token;
    console.log('=== Token Generated ===');
    console.log('Token length:', token ? token.length : 'NO TOKEN');
    console.log('Token preview:', token ? token.substring(0, 50) + '...' : 'NO TOKEN');
    
    if (!token) {
      throw new Error('Token is null or undefined');
    }
    
    return token;
  } catch (error) {
    console.error('=== Token Generation Error ===');
    const errorObj = error as Error;
    console.error('Error type:', errorObj.constructor.name);
    console.error('Error message:', errorObj.message);
    console.error('Error stack:', errorObj.stack);
    
    // JWTクライアントの詳細情報も出力
    console.error('JWT Client details:');
    console.error('- Email:', key.client_email);
    console.error('- Project ID:', key.project_id);
    console.error('- Private key exists:', !!key.private_key);
    console.error('- Private key starts with:', key.private_key ? key.private_key.substring(0, 50) + '...' : 'NO KEY');
    
    throw error;
  }
}

// 代替の認証方法（GoogleAuthを使用）
async function getAccessTokenWithGoogleAuth() {
  console.log('=== Trying GoogleAuth method ===');
  try {
    let auth;
    
    // Check if credentials are provided as JSON string
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS && process.env.GOOGLE_APPLICATION_CREDENTIALS.trim().startsWith('{')) {
      console.log('Using credentials from environment variable JSON');
      const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
      auth = new GoogleAuth({
        credentials: credentials,
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      });
    } else {
      console.log('Using keyFile path');
      auth = new GoogleAuth({
        keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      });
    }
    
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    
    console.log('=== GoogleAuth Token Generated ===');
    console.log('Token length:', token.token ? token.token.length : 'NO TOKEN');
    console.log('Token preview:', token.token ? token.token.substring(0, 50) + '...' : 'NO TOKEN');
    
    return token.token;
  } catch (error) {
    console.error('=== GoogleAuth Error ===');
    const errorObj = error as Error;
    console.error('Error:', errorObj);
    throw error;
  }
}

type Document = { text: string; [key: string]: unknown };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ answer: string } | { error: string }>
) {
  console.log('=== API Route called ===');
  console.log('Method:', req.method);
  console.log('Body:', req.body);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { question, conversationHistory } = req.body as { question: string; conversationHistory?: { role: string; text: string }[] };
  if (!question) {
    return res.status(400).json({ error: 'No question provided' });
  }
  
  // 文脈理解のための質問分析
  const analyzeQuestionContext = (question: string, history?: { role: string; text: string }[]) => {
    const contextKeywords = ['上記', '前述', '先ほど', '先の', '前の', '先述', '上記の回答', '上記の内容', '先ほどの回答', '先の回答'];
    const pronounKeywords = ['それ', 'これ', 'その', 'この', 'あれ', 'あの'];
    const hasContextReference = contextKeywords.some(keyword => question.includes(keyword));
    const hasPronounReference = pronounKeywords.some(keyword => question.includes(keyword));
    
    // 会話履歴から前の質問と回答を抽出
    let previousContext = '';
    if (history && history.length > 0) {
      const lastExchange = history.slice(-2); // 最後の質問と回答
      previousContext = lastExchange.map(msg => `${msg.role}: ${msg.text}`).join('\n');
    }
    
    return {
      hasContextReference,
      hasPronounReference,
      isFollowUpQuestion: hasContextReference || hasPronounReference,
      needsContext: hasContextReference || hasPronounReference,
      previousContext
    };
  };
  
  const contextAnalysis = analyzeQuestionContext(question, conversationHistory);
  console.log('=== Context Analysis ===');
  console.log('Question:', question);
  console.log('Has context reference:', contextAnalysis.hasContextReference);
  console.log('Is follow-up question:', contextAnalysis.isFollowUpQuestion);

  // Weaviateで類似文書検索
  const client = weaviate.client({
    scheme: 'https',
    host: process.env.WEAVIATE_ENDPOINT!,
    apiKey: new weaviate.ApiKey(process.env.WEAVIATE_API_KEY!),
  });

  console.log('=== Weaviate Client Created ===');
  console.log('Endpoint:', process.env.WEAVIATE_ENDPOINT);
  console.log('API Key exists:', !!process.env.WEAVIATE_API_KEY);

  let context = '';
  try {
    console.log('=== Starting Weaviate Search ===');
    console.log('Search query:', question);
    
    // 改善された検索クエリ生成
    const createSearchQueries = (question: string) => {
      // より細かい日本語の検索語分割
      let baseTerms = question
        .replace(/[、。？！\s]+/g, ' ') // 句読点を空白に変換
        .split(/\s+/) // 空白で分割
        .filter(term => term.length > 0); // 空文字を除外
      
      // 長い単語をさらに分割
      const splitLongTerms = (terms: string[]) => {
        const result: string[] = [];
        for (const term of terms) {
          if (term.length <= 3) {
            result.push(term);
          } else {
            // 長い単語を2-3文字ずつに分割
            for (let i = 0; i < term.length - 1; i++) {
              const chunk = term.slice(i, i + 3);
              if (chunk.length >= 2) {
                result.push(chunk);
              }
            }
          }
        }
        return result;
      };
      
      baseTerms = splitLongTerms(baseTerms);
      
      // 日本語文字のみを抽出し、短すぎる語を除外
      baseTerms = baseTerms
        .map(term => term.replace(/[^\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, ''))
        .filter(term => term.length >= 2) // 2文字以上の語のみ
        .slice(0, 8); // 最大8語まで
      
      console.log('Base terms after splitting:', baseTerms);
      
      // 同義語・関連語のマッピング
      const synonyms: { [key: string]: string[] } = {
        '保育': ['保育所', '幼稚園', '教育', '子育て', '養護'],
        '特徴': ['特色', '性質', '性格', '特徴的', '特徴的'],
        '幼児': ['子ども', '園児', '児童', '乳幼児'],
        '教育': ['保育', '指導', '育成', '発達'],
        '環境': ['雰囲気', '状況', '条件', '設定'],
        '方法': ['やり方', '手段', '手法', 'アプローチ'],
        '遊び': ['遊戯', 'ゲーム', '活動', '体験'],
        '安全': ['安心', '危険', '保護', 'セキュリティ'],
        '何': ['どのような', 'どんな', 'どの'],
        'です': ['', 'である', 'だ'],
        'か': ['', 'でしょうか', 'でしょうか'],
        'について': ['に関して', 'の', 'は'],
        '教えて': ['説明', '詳しく', '知りたい'],
        'ください': ['', 'お願い']
      };
      
      // 検索語を展開
      const expandedTerms = baseTerms.map(term => {
        const synonymList = synonyms[term] || [];
        return [term, ...synonymList];
      }).flat();
      
      // 重複を除去して返す
      const uniqueTerms = [...new Set(expandedTerms)];
      const finalTerms = uniqueTerms.slice(0, 8); // 最大8語まで
      
      console.log('Expanded terms:', finalTerms);
      return finalTerms;
    };
    
    const searchQueries = createSearchQueries(question);
    console.log('Enhanced search terms:', searchQueries);
    
    let searchResult;
    let searchMethod = 'unknown';
    
    // 改善された検索方法（優先順位を調整）
    const searchMethods = [
      { name: 'enhanced_bm25', priority: 1 },
      { name: 'bm25', priority: 2 },
      { name: 'simple', priority: 3 },
      { name: 'random', priority: 4 }
    ];
    
    for (const methodInfo of searchMethods) {
      const method = methodInfo.name;
      try {
        if (method === 'enhanced_bm25') {
          // 複数のクエリでBM25検索を試行
          const searchPromises = searchQueries.slice(0, 3).map(query => 
            client.graphql.get()
              .withClassName('Document')
              .withFields('text')
              .withBm25({ query })
              .withLimit(2)
              .do()
              .catch(() => null)
          );
          
          const results = await Promise.all(searchPromises);
          const validResults = results.filter(result => result !== null);
          
          if (validResults.length > 0) {
            // 結果を統合
            const allDocs = validResults.flatMap(result => result.data.Get.Document);
            const uniqueDocs = allDocs.filter((doc: Document, index: number, self: Document[]) => 
              index === self.findIndex((d: Document) => d.text === doc.text)
            );
            
            searchResult = {
              data: {
                Get: {
                  Document: uniqueDocs.slice(0, 5)
                }
              }
            };
            searchMethod = 'enhanced_bm25';
            console.log('Enhanced BM25 search successful with', uniqueDocs.length, 'documents');
          }
        } else if (method === 'bm25') {
          // 従来のBM25検索
          searchResult = await client.graphql.get()
            .withClassName('Document')
            .withFields('text')
            .withBm25({ query: searchQueries.join(' ') })
            .withLimit(5)
            .do();
          searchMethod = 'bm25';
          console.log('BM25 search successful');
        } else if (method === 'simple') {
          // 改善された単純テキスト検索
          const simpleQueries = searchQueries.slice(0, 2);
          const searchPromises = simpleQueries.map(query => 
            client.graphql.get()
              .withClassName('Document')
              .withFields('text')
              .withWhere({
                operator: 'ContainsAny',
                path: ['text'],
                valueText: query
              })
              .withLimit(3)
              .do()
              .catch(() => null)
          );
          
          const results = await Promise.all(searchPromises);
          const validResults = results.filter(result => result !== null);
          
          if (validResults.length > 0) {
            const allDocs = validResults.flatMap(result => result.data.Get.Document);
            const uniqueDocs = allDocs.filter((doc: Document, index: number, self: Document[]) => 
              index === self.findIndex((d: Document) => d.text === doc.text)
            );
            
            searchResult = {
              data: {
                Get: {
                  Document: uniqueDocs.slice(0, 5)
                }
              }
            };
            searchMethod = 'simple';
            console.log('Simple search successful with', uniqueDocs.length, 'documents');
          }
        } else if (method === 'random') {
          // ランダムに文書を取得
          searchResult = await client.graphql.get()
            .withClassName('Document')
            .withFields('text')
            .withLimit(5)
            .do();
          searchMethod = 'random';
          console.log('Random search used as fallback');
        }
        
        // 結果がある場合はループを抜ける
        if (searchResult && searchResult.data.Get.Document.length > 0) {
          break;
        }
      } catch (error) {
        const errorObj = error as Error;
        console.log(`${method} search failed:`, errorObj.message);
        continue;
      }
    }
    
    console.log('=== Weaviate Search Result ===');
    console.log('Search method used:', searchMethod);
    console.log('Result:', JSON.stringify(searchResult, null, 2));
    console.log('Documents found:', searchResult?.data?.Get?.Document?.length ?? 0);
    
    // 改善された関連性フィルタリング
    const documents = searchResult?.data?.Get?.Document ?? [];
    const relevantDocs = documents.filter((doc: Document) => {
      const text = doc.text.toLowerCase();
      const queryTerms = searchQueries.map(term => term.toLowerCase());
      
      // より柔軟な関連性判定
      const matchCount = queryTerms.filter(term => text.includes(term)).length;
      const relevanceScore = matchCount / queryTerms.length;
      
      // 文脈参照質問の場合は、より厳格なフィルタリング
      const threshold = contextAnalysis.needsContext ? 0.2 : 0.1;
      
      // 文書の長さも考慮（短すぎる文書は除外）
      const isValidLength = doc.text.length > 50;
      
      return relevanceScore > threshold && isValidLength;
    });
    
    // 関連性の高い文書を優先、なければ全件使用
    const docsToUse = relevantDocs.length > 0 ? relevantDocs : documents;
    context = docsToUse.map((doc: Document) => doc.text).join('\n\n');
    
    console.log('=== Context Extracted ===');
    console.log('Context length:', context.length);
    console.log('Relevant documents found:', relevantDocs.length);
    console.log('Total documents used:', docsToUse.length);
    console.log('Search queries used:', searchQueries);
    console.log('Relevance threshold: 10%');
    console.log('Context preview:', context.substring(0, 200) + '...');
  } catch (e) {
    console.error('=== Weaviate Search Error ===');
    console.error('Error:', e);
    context = '（Weaviate検索に失敗しました）';
  }

  // Vertex AI Gemini REST APIで生成
  let answer = '';
  try {
    let accessToken;
    try {
      accessToken = await getAccessToken();
    } catch {
      console.log('JWT method failed, trying GoogleAuth...');
      accessToken = await getAccessTokenWithGoogleAuth();
    }
    
    const location = process.env.VERTEX_AI_LOCATION || 'asia-northeast1';
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID!;
    const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/gemini-1.5-flash:generateContent`;
    
    // 改善されたプロンプトを作成
    const contextInfo = contextAnalysis.needsContext ? 
      `\n【文脈情報】
この質問は前の会話の文脈を参照している可能性があります。文脈を考慮して回答してください。

【前の会話】
${contextAnalysis.previousContext}` : '';
    
    const prompt = `あなたは日本の保育・教育に関する専門的な知識を持つアシスタントです。

【参考文書】
${context}

【質問】
${question}${contextInfo}

【回答の指示】
1. 質問の内容を分析し、以下の場合のみ確認の質問をしてください：
   - 質問が1語のみで、文脈から推測できない場合（例：「保育」「ICT」など）
   - 質問が非常に曖昧で、複数の解釈が可能で、適切な回答が困難な場合

2. 確認が必要な場合のみ、以下の形式で回答してください：
   「ご質問の内容をより詳しく教えていただけますか？以下の点について確認させてください：
   [具体的な確認事項を箇条書きで記載]
   
   これらの点を教えていただければ、より適切な回答をお届けできます。」

3. それ以外の場合は、以下の指示に従って回答してください：
   - 参考文書の内容を基に、具体的で正確な回答を提供してください
   - 参考文書に含まれていない情報については、一般的な保育・教育の知識を補完して回答してください
   - 参考文書に該当する情報がない場合は、その旨を明記してから一般的な知識で回答してください
   - 日本語で丁寧に回答してください
   - 必要に応じて箇条書きや構造化された形式で回答してください
   - 専門用語は分かりやすく説明してください
   - 実践的なアドバイスを含めてください
   - 回答の最後にまとめの段落を設けてください
   - 「質問がありません」「質問を入力してください」などの返答はしないでください。質問文が疑問文でなくても、内容が明確なら必ず回答を始めてください。
   - 文脈参照質問の場合は、前の会話の内容を踏まえて適切に回答してください
   - 代名詞（それ、これ、その、このなど）が含まれる質問の場合は、前の会話から何を指しているかを推測して回答してください
   - 「この方法」「その問題点」などの表現が含まれる場合は、前の会話で言及された内容を具体的に指していると理解してください

【回答】`;
    
    const body = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
    };
    
    console.log('=== Vertex AI Request ===');
    console.log('Access Token length:', accessToken ? accessToken.length : 'NO TOKEN');
    console.log('Endpoint:', endpoint);
    console.log('Project ID:', projectId);
    console.log('Location:', location);
    console.log('Request Body:', JSON.stringify(body, null, 2));
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });
    
    console.log('=== Vertex AI Response ===');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log('Response Data:', JSON.stringify(data, null, 2));
    
    if (!response.ok) {
      console.error('Vertex AI REST error:', data);
      answer = 'Vertex AIでの生成に失敗しました: ' + (data.error?.message || JSON.stringify(data));
    } else {
      answer = data.candidates?.[0]?.content?.parts?.[0]?.text || '回答生成に失敗しました';
    }
  } catch (e) {
    console.error('Vertex AI REST error:', e);
    answer = 'Vertex AIでの生成に失敗しました。';
  }

  res.status(200).json({ answer });
} 
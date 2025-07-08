const fetch = require('node-fetch').default;

const testCases = [
  // 基本的な質問
  {
    question: '安全',
    description: '短い単語のみ'
  },
  {
    question: '保育の特徴は何ですか？',
    description: '明確な質問'
  },
  {
    question: '現在の保育の問題はどのようにありますか。',
    description: '長い質問'
  },
  // 文脈を参照する質問
  {
    question: '上記の回答は、元の質問に答えになると思いますか。',
    description: '文脈参照質問',
    conversationHistory: [
      { role: 'user', text: '保育の特徴は何ですか？' },
      { role: 'ai', text: '保育の特徴について説明しました。保育には環境構成の重要性、個別対応の重視、評価における留意点、集団生活における社会性の育成などの特徴があります。' }
    ]
  },
  {
    question: 'それについて詳しく教えてください。',
    description: '代名詞を使用した質問',
    conversationHistory: [
      { role: 'user', text: 'ICT活用の意義' },
      { role: 'ai', text: 'ICT活用の意義について説明しました。ICT活用は教育内容の充実と質の向上、教師の負担軽減と効率化、保護者との連携強化などの意義があります。' }
    ]
  },
  {
    question: 'その問題点は何ですか？',
    description: '代名詞を使用した質問（問題点を指す）',
    conversationHistory: [
      { role: 'user', text: '保育所でのICT導入の注意点について教えてください' },
      { role: 'ai', text: 'ICT導入の注意点として、幼児の発達段階に適したICT活用、教育効果の最大化と目的の明確化、保護者との連携などが重要です。' }
    ]
  },
  {
    question: 'この方法は効果的ですか？',
    description: '代名詞を使用した質問（方法を指す）',
    conversationHistory: [
      { role: 'user', text: '幼児教育の方法' },
      { role: 'ai', text: '幼児教育の方法として、環境構成による教育、個別対応と一人ひとりのよさを育む教育、集団生活を通した社会性育成などがあります。' }
    ]
  }
];

const endpoint = 'http://localhost:3000/api/ask';

async function testQueries() {
  for (const testCase of testCases) {
    console.log('==============================');
    console.log('Description:', testCase.description);
    console.log('Q:', testCase.question);
    
    if (testCase.conversationHistory) {
      console.log('Context:', testCase.conversationHistory.map(msg => `${msg.role}: ${msg.text.slice(0, 50)}...`).join(' | '));
    }
    
    try {
      const body = {
        question: testCase.question,
        conversationHistory: testCase.conversationHistory || []
      };
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      console.log('A:', data.answer?.slice(0, 300) || '(no answer)');
      console.log('Answer length:', data.answer?.length || 0);
      console.log('---');
    } catch (e) {
      console.error('Error:', e.message);
    }
  }
}

testQueries(); 
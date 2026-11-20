const KB_ARTICLES = [
  {
    id: 'kb-billing',
    category: 'Billing & Invoices',
    keywords: ['invoice', 'gst', 'refund', 'charged', 'payment', 'upi', 'card', 'billing', 'receipt'],
    title: 'GST Invoices, Refunds & Failed Payment Recovery',
    draftReply: 'Thanks for reaching out. I have checked your billing ticket and attached the GST invoice/payment reference details. If a duplicate charge occurred, our refund workflow initiates within 5–7 business days. Please confirm your transaction ID if you need a manual ledger check.',
  },
  {
    id: 'kb-auth',
    category: 'Auth & Access',
    keywords: ['login', 'otp', 'password', 'token', '401', '403', 'permission', 'role', 'sso', 'locked'],
    title: 'Authentication Errors, Token Expiry & Role Permissions',
    draftReply: 'Thanks for flagging this access issue. Please verify that your session token or SSO role has not expired and that your workspace permissions are active. If the account is locked after repeated attempts, I can trigger a fresh verification flow right away.',
  },
  {
    id: 'kb-infra',
    category: 'Cloud & API',
    keywords: ['502', '503', '504', 'timeout', 'latency', 'webhook', 'docker', 'deploy', 'api', 'crash', 'down', 'ssl'],
    title: 'API Latency, Webhook Retries & Deployment Health',
    draftReply: 'Thanks for reporting this service issue. Our triage pipeline logged the error signature and checked upstream health/webhook delivery. Please share a sample request ID or timestamp so we can trace the exact span and close this out.',
  },
];

export function analyzeTicket({ subject = '', description = '', customerEmail = '' }) {
  const text = `${subject} ${description}`.toLowerCase();
  let category = 'General Workflow';
  let matchedKb = null;

  for (const article of KB_ARTICLES) {
    if (article.keywords.some((kw) => text.includes(kw))) {
      category = article.category;
      matchedKb = article;
      break;
    }
  }

  const urgentWords = ['outage', 'down', 'production', 'prod', 'urgent', 'critical', 'data loss', '502', '503', 'blocked', 'locked out', 'charged twice'];
  const highWords = ['bug', 'error', 'failed', 'failing', 'timeout', 'refund', 'invoice', 'delay', 'broken', '401', '403'];

  let priority = 'Medium';
  let slaHours = 12;
  if (urgentWords.some((w) => text.includes(w))) {
    priority = 'Urgent';
    slaHours = 2;
  } else if (highWords.some((w) => text.includes(w))) {
    priority = 'High';
    slaHours = 6;
  } else if (text.includes('question') || text.includes('how to') || text.includes('feature')) {
    priority = 'Low';
    slaHours = 24;
  }

  const sentiment = urgentWords.some((w) => text.includes(w)) || text.includes('frustrated') || text.includes('angry')
    ? 'Escalating'
    : text.includes('thanks') || text.includes('please')
      ? 'Constructive'
      : 'Neutral';

  const suggestedReply = matchedKb
    ? matchedKb.draftReply
    : `Hi ${customerEmail ? customerEmail.split('@')[0] : 'there'}, thanks for writing in regarding "${subject || 'your request'}". I have logged your ticket under ${category} (${priority} priority) and will follow up with next steps shortly.`;

  return { category, priority, slaHours, sentiment, kbTitle: matchedKb?.title || 'Standard Support Runbook', suggestedReply };
}

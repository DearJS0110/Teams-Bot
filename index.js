require('dotenv').config();
const restify = require('restify');
const { BotFrameworkAdapter, MemoryStorage, ConversationState, UserState } = require('botbuilder');

// Khởi tạo adapter
const adapter = new BotFrameworkAdapter({
  appId: process.env.MICROSOFT_APP_ID,
  appPassword: process.env.MICROSOFT_APP_PASSWORD
});

// Lưu trạng thái (nếu cần)
const memoryStorage = new MemoryStorage();
const conversationState = new ConversationState(memoryStorage);
const userState = new UserState(memoryStorage);

// Bot đơn giản trả lời lại tin nhắn
const server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, () => {
  console.log(`\nBot is listening on ${server.url}`);
});

server.post('/api/messages', async (req, res) => {
  adapter.processActivity(req, res, async (context) => {
    if (context.activity.type === 'message') {
      // Gọi n8n webhook để xử lý (ví dụ bằng fetch)
      const userMessage = context.activity.text;

      // Gọi webhook n8n ở đây
      const fetch = require('node-fetch');
      const response = await fetch(process.env.N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: userMessage, userId: context.activity.from.id })
      });

      const result = await response.json();

      await context.sendActivity(result.reply || 'Đã nhận tin nhắn!');
    }
  });
});

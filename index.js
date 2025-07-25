require('dotenv').config();
const restify = require('restify');
const fetch = require('node-fetch');
const { BotFrameworkAdapter, MemoryStorage, ConversationState, UserState } = require('botbuilder');

const adapter = new BotFrameworkAdapter({
  appId: process.env.MICROSOFT_APP_ID,
  appPassword: process.env.MICROSOFT_APP_PASSWORD
});

const memoryStorage = new MemoryStorage();
const conversationState = new ConversationState(memoryStorage);
const userState = new UserState(memoryStorage);

const server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, () => {
  console.log(`Bot is listening on ${server.url}`);
});

server.post('/api/messages', async (req, res) => {
  // Đợi processActivity hoàn thành mới trả về response HTTP
  await adapter.processActivity(req, res, async (context) => {
    if (context.activity.type === 'message') {
      const userMessage = context.activity.text;
      console.log('Received message:', userMessage);

      try {
        console.log('Calling n8n webhook...');
        const response = await fetch(process.env.N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: userMessage, userId: context.activity.from.id }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Response from n8n:', result);

        // Dùng result.reply hoặc result.output tuỳ cấu hình n8n trả về
        const replyText = result.reply || result.output || 'Đã nhận tin nhắn!';
        await context.sendActivity(replyText);
      } catch (error) {
        console.error('Error calling n8n webhook:', error);
        await context.sendActivity('Xin lỗi, có lỗi xảy ra khi xử lý yêu cầu của bạn.');
      }
    } else {
      console.log(`Ignored activity type: ${context.activity.type}`);
    }
  });
});

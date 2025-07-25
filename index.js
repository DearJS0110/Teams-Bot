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
  adapter.processActivity(req, res, async (context) => {
    if (context.activity.type === 'message') {
      const userMessage = context.activity.text;

      try {
        // Gọi webhook n8n chờ kết quả trả về
        const response = await fetch(process.env.N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: userMessage, userId: context.activity.from.id }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Đảm bảo parse JSON đúng format, ví dụ { reply: "text trả về" }
        const result = await response.json();

        // Gửi phản hồi tới Teams đúng nội dung n8n trả về
        await context.sendActivity(result.output || 'Đã nhận tin nhắn!');
      } catch (error) {
        console.error('Error calling n8n webhook:', error);
        await context.sendActivity('Xin lỗi, có lỗi xảy ra khi xử lý yêu cầu của bạn.');
      }
    } else {
      console.log(`Ignored activity type: ${context.activity.type}`);
    }
  });
});

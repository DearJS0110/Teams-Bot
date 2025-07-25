require('dotenv').config();
const restify = require('restify');
const fetch = require('node-fetch');
const { BotFrameworkAdapter, MemoryStorage, ConversationState, UserState } = require('botbuilder');

// Khởi tạo adapter Bot Framework
const adapter = new BotFrameworkAdapter({
  appId: process.env.MICROSOFT_APP_ID,
  appPassword: process.env.MICROSOFT_APP_PASSWORD
});

// Khởi tạo lưu trạng thái (nếu cần)
const memoryStorage = new MemoryStorage();
const conversationState = new ConversationState(memoryStorage);
const userState = new UserState(memoryStorage);

// Tạo server Restify lắng nghe trên port cấu hình hoặc 3978 mặc định
const server = restify.createServer();
server.listen(process.env.PORT || process.env.port || 3978, () => {
  console.log(`\nBot is listening on ${server.url}`);
});

// Xử lý endpoint nhận message từ Teams
server.post('/api/messages', async (req, res) => {
  adapter.processActivity(req, res, async (context) => {
    if (context.activity.type === 'message') {
      try {
        const userMessage = context.activity.text;
        const userId = context.activity.from.id;
        const conversationType = context.activity.conversation.conversationType; // personal, channel, groupChat

        // Gửi data đến webhook n8n để xử lý
        const response = await fetch(process.env.N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: userMessage,
            userId: userId,
            conversationType: conversationType,
            conversationId: context.activity.conversation.id
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Lấy kết quả trả về từ n8n
        const result = await response.json();

        // Lấy reply từ result (giả sử n8n trả về { reply: "..." })
        const replyText = result.reply || 'Xin lỗi, tôi chưa hiểu câu hỏi của bạn.';

        // Trả lời lại user trong Teams
        await context.sendActivity(replyText);

      } catch (error) {
        console.error('Error calling n8n webhook:', error);
        await context.sendActivity('Xin lỗi, có lỗi xảy ra khi xử lý yêu cầu của bạn.');
      }
    } else {
      // Có thể handle các loại activity khác nếu cần
      console.log(`Ignored activity type: ${context.activity.type}`);
    }
  });
});

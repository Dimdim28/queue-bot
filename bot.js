const { MongoClient } = require("mongodb");
const TelegramApi = require("node-telegram-bot-api");

const bot = new TelegramApi(token, { polling: true });
const client = new MongoClient(url);

// // Database Name
const dbName = "queueBotBase";
const db = client.db(dbName);
const usersCollection = db.collection("users");

const start = () => {
  client.connect();
  const testOptions = {
    reply_markup: JSON.stringify({
      inline_keyboard: [
        [{ text: "brothers", callback_data: "fdf" }],
        [
          { text: "billy", callback_data: "sgf" },
          { text: "van", callback_data: "ddd" },
        ],
      ],
    }),
  };

  bot.setMyCommands([
    { command: "/start", description: "Запустить бота" },
    { command: "/info", description: "Посмотреть инфу о боте" },
    { command: "/test", description: "тестовые кнопочки" },
    { command: "/new", description: "создать новую очередь" },
    { command: "/delete", description: "удалить очередь" },
    { command: "/add", description: "добавить в очередь" },
    { command: "/remove", description: "убрать из очереди" },
    { command: "/start", description: "запустить очередь" },
    { command: "/next", description: "вызвать следующего" },
  ]);

  bot.on("message", async (msg) => {
    console.log(msg);
    const text = msg.text;
    if (text === "/info") return bot.sendMessage(msg.chat.id, "this is info");
    if (text === "/test")
      return bot.sendMessage(msg.chat.id, "check", testOptions);
    if (text === "/new") {
      await usersCollection.insertOne({
        id: msg.from.username,
      });
      return bot.sendMessage(msg.chat.id, "создано");
    }
    return bot.sendMessage(msg.chat.id, `what does it mean : ${text}??`);
  });
};

start();

const { MongoClient } = require("mongodb");
const TelegramApi = require("node-telegram-bot-api");

const bot = new TelegramApi(token, { polling: true });
const client = new MongoClient(url);

// // Database Name
const dbName = "queueBotBase";
const db = client.db(dbName);
const queuesCollection = db.collection("queues");

const start = () => {
  client.connect();
  const addToQueueOptions = {
    reply_markup: JSON.stringify({
      inline_keyboard: [
        [{ text: "Записаться", callback_data: "addMeToQueue" }],
      ],
    }),
  };

  bot.setMyCommands([
    { command: "/start", description: "Запустить бота" },
    { command: "/info", description: "Посмотреть инфу о боте" },
    { command: "/new", description: "создать новую очередь" },
    { command: "/delete", description: "удалить очередь" },
    { command: "/add", description: "добавить в очередь" },
    { command: "/remove", description: "убрать из очереди" },
    { command: "/start", description: "запустить очередь" },
    { command: "/next", description: "вызвать следующего" },
  ]);

  bot.on("message", async (msg) => {
    if (!msg.text.startsWith("/")) return;
    console.log(msg);
    const text = msg.text;
    if (text === "/info") return bot.sendMessage(msg.chat.id, "this is info");
    if (text.startsWith("/new")) {
      const queueName = text.replace("/new", "").trim();
      if (!queueName)
        return bot.sendMessage(
          msg.chat.id,
          "Введите название очереди после /new"
        );
      const nameFromQueue = await queuesCollection.findOne({
        name: queueName,
      });
      if (!!nameFromQueue)
        return bot.sendMessage(
          msg.chat.id,
          "очередь с таким названием уже есть!"
        );

      await queuesCollection.insertOne({
        name: queueName,
        people: [],
      });
      return bot.sendMessage(
        msg.chat.id,
        `очередь ${queueName} создана`,
        addToQueueOptions
      );
    }
    return bot.sendMessage(msg.chat.id, `what does it mean : ${text}??`);
  });

  bot.on("callback_query", async (msg) => {
    console.log("msg =", msg);
    const data = msg.data;
    const from = msg.from;
    const userId = from.id;
    const userTag = from.username;
    const baseName = msg.message.text.split(" ")[1];
    console.log(data, from, userId, userTag, baseName);
    if (data === "addMeToQueue") {
      await queuesCollection.updateOne(
        { name: baseName },
        { $push: { people: { id: userId, tag: userTag } } }
      );
      return bot.sendMessage(msg.message.chat.id, `@${userTag} в очереди `);
    }
  });
};

start();

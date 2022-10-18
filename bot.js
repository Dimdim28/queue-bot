const { MongoClient } = require("mongodb");
const TelegramApi = require("node-telegram-bot-api");
const { addMeToQueueOptions } = require("./options");

const bot = new TelegramApi(token, { polling: true });
const client = new MongoClient(url);

// // Database Name
const dbName = "queueBotBase";
const db = client.db(dbName);
const queuesCollection = db.collection("queues");

const start = () => {
  client.connect();

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
    const chatId = msg.chat.id;
    if (text === "/info") return bot.sendMessage(chatId, "this is info");
    if (text.startsWith("/new")) {
      const queueName = text.replace("/new", "").trim();
      const addToQueueOptions = addMeToQueueOptions(queueName);

      if (!queueName)
        return bot.sendMessage(chatId, "Введите название очереди после /new");
      const nameFromQueue = await queuesCollection.findOne({
        name: queueName,
      });
      if (!!nameFromQueue)
        return bot.sendMessage(
          chatId,
          "очередь с таким названием уже есть!",
          addToQueueOptions
        );

      await queuesCollection.insertOne({
        name: queueName,
        people: [],
      });
      return bot.sendMessage(
        chatId,
        `очередь ${queueName} создана`,
        addToQueueOptions
      );
    }
    return bot.sendMessage(chatId, `what does it mean : ${text}??`);
  });

  bot.on("callback_query", async (msg) => {
    console.log("msg =", msg);
    const data = msg.data;
    const from = msg.from;
    const userId = from.id;
    const userTag = from.username;
    const chatId = msg.message.chat.id;
    //console.log(data, from, userId, userTag, baseName);

    if (data.startsWith("addMeToQueue:")) {
      const baseName = data.replace("addMeToQueue:", "");
      const userInQueue = await queuesCollection.findOne({
        name: baseName,
        people: { $elemMatch: { id: userId, tag: userTag } },
      });
      //console.log(userInQueue);
      if (!!userInQueue) {
        return bot.sendMessage(chatId, `Вы уже в очереди`);
      }
      await queuesCollection.updateOne(
        { name: baseName },
        { $push: { people: { id: userId, tag: userTag } } }
      );
      return bot.sendMessage(chatId, `@${userTag} в очереди `);
    }
  });
};

start();

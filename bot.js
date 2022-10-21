const { MongoClient } = require("mongodb");
const TelegramApi = require("node-telegram-bot-api");
const { addMeToQueueOptions, LookMyQueuesOptions } = require("./options");

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
    { command: "/help", description: "Команды для работы с очередями" },
    { command: "/viewmyqueues", description: "Посмотреть мои очереди" },
  ]);

  bot.on("message", async (msg) => {
    if (!msg.text.startsWith("/")) return;

    const text = msg.text;
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (text === "/start") {
      return bot.sendMessage(chatId, "Вас приветствует queue_bot =)");
    }

    if (text === "/help") {
      const array = [
        "/info  -  посмотреть информацию о боте",
        "/help  -  посмотреть эту подсказку",
        "/new name   -   создать очередь с именем name (создается пустой, появляются кнопки для работы с ней)",
        "/delete name   -   удалить очередь с именем name (может только создатель очереди)",
        "/viewmyqueues  -  вызвать меню с кнопками для просмотра очередей где пользователь записан или очередей которые он создал",
        "/find partOfName -  найти очередь в имени которой есть partOfName",
        "/look name  -  посмотреть на очередь name",
      ];
      return bot.sendMessage(chatId, `список команд:\n\n${array.join("\n")}`);
    }

    if (text === "/info") {
      return bot.sendMessage(
        chatId,
        "Bot developed by @D_im0N and @Nailggy to create queues and work with them =)"
      );
    }

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
        creatorId: userId,
      });
      return bot.sendMessage(
        chatId,
        `очередь ${queueName} создана`,
        addToQueueOptions
      );
    }

    if (text.startsWith("/look")) {
      const queueName = text.replace("/look", "").trim();
      const addToQueueOptions = addMeToQueueOptions(queueName);

      if (!queueName)
        return bot.sendMessage(chatId, "Введите название очереди после /look");
      const nameFromQueue = await queuesCollection.findOne({
        name: queueName,
      });

      if (!nameFromQueue)
        return bot.sendMessage(chatId, `очереди  ${queueName} не существует!`);

      return bot.sendMessage(
        chatId,
        `очередь ${queueName}:`,
        addToQueueOptions
      );
    }

    if (text.startsWith("/find")) {
      const queueName = text.replace("/find", "").trim();
      const expr = new RegExp(queueName, "i");
      if (!queueName) {
        return bot.sendMessage(chatId, "Введите название очереди после /find");
      }

      const myQueues = [];

      const cursor = await queuesCollection
        .find({
          name: { $regex: expr },
        })
        .limit(10);

      await cursor.forEach(function (obj) {
        myQueues.push(obj["name"]);
      });

      if (!myQueues.length) return bot.sendMessage(chatId, "ничего не найдено");

      return bot.sendMessage(
        chatId,
        `Найденные очереди : \n\n${myQueues.join(
          "\n"
        )}\n\n*Выведет максимум 10*`
      );
    }

    if (text.startsWith("/delete")) {
      const queueName = text.replace("/delete", "").trim();
      if (!queueName)
        return bot.sendMessage(
          chatId,
          "Введите после /delete название очереди, которую хотите удалить"
        );
      const nameFromQueue = await queuesCollection.findOne({
        name: queueName,
        creatorId: userId,
      });
      if (!nameFromQueue)
        return bot.sendMessage(
          chatId,
          "Вы не создатель очереди или очереди с таким названием нет"
        );
      await queuesCollection.deleteOne({
        name: queueName,
      });
      return bot.sendMessage(chatId, `очередь ${queueName} удалена`);
    }

    if (text === "/viewmyqueues") {
      const options = LookMyQueuesOptions();
      return bot.sendMessage(chatId, `Какие очереди интересуют?`, options);
    }

    return;
  });

  bot.on("callback_query", async (msg) => {
    const data = msg.data;
    const from = msg.from;
    const userId = from.id;
    const userTag = from.username;
    const chatId = msg.message.chat.id;
    //console.log(data, from, userId, userTag, baseName);

    if (data.startsWith("addMeToQueue:")) {
      const baseName = data.replace("addMeToQueue:", "");
      const queue = await queuesCollection.findOne({
        name: baseName,
      });
      if (!queue) {
        return bot.sendMessage(chatId, `Очереди уже не существует!`);
      }

      const userInQueue = await queuesCollection.findOne({
        name: baseName,
        people: { $elemMatch: { id: userId, tag: userTag } },
      });
      if (!!userInQueue) {
        return bot.sendMessage(chatId, `Вы уже в очереди`);
      }

      await queuesCollection.updateOne(
        { name: baseName },
        { $push: { people: { id: userId, tag: userTag } } }
      );
      return bot.sendMessage(chatId, `@${userTag} в очереди `);
    }

    if (data.startsWith("viewQueue:")) {
      const queueName = data.replace("viewQueue:", "");
      const queue = await queuesCollection.findOne({
        name: queueName,
      });
      if (!queue)
        return bot.sendMessage(chatId, `Очередь ${queueName} не существует!`);
      const people = queue.people;
      if (!people.length)
        return bot.sendMessage(chatId, `Очередь ${queueName} сейчас пустая`);

      return bot.sendMessage(
        chatId,
        `Название очереди: ${queueName}\n\n${people
          .map((member, index) => `${++index}: ${member.tag}`)
          .join("\n")}`
      );
    }

    if (data.startsWith("removeMeFromQueue:")) {
      const queueName = data.replace("removeMeFromQueue:", "");

      const queue = await queuesCollection.findOne({
        name: queueName,
        people: { $elemMatch: { id: userId, tag: userTag } },
      });

      if (!queue) {
        const queueTest = await queuesCollection.findOne({
          name: queueName,
        });
        if (!queueTest)
          return bot.sendMessage(chatId, `Очередь ${queueName} не существует!`);
        return bot.sendMessage(
          chatId,
          `Вы не записаны в очередь ${queueName} `
        );
      }

      await queuesCollection.updateOne(
        { name: queueName },
        { $pull: { people: { id: userId, tag: userTag } } }
      );

      const checkingQueue = await queuesCollection.findOne({
        name: queueName,
        people: [],
      });

      if (!!checkingQueue) {
        await queuesCollection.deleteOne({
          name: queueName,
        });
        return bot.sendMessage(chatId, `${queueName} опустела,и была удалена`);
      }

      return bot.sendMessage(chatId, `@${userTag} выписался из очереди`);
    }

    if (data === "lookMyQueues") {
      const cursor = await queuesCollection
        .find({ people: { id: userId, tag: userTag } })
        .limit(10);

      const myQueues = [];

      await cursor.forEach(function (obj) {
        myQueues.push(obj["name"]);
      });

      if (!myQueues.length)
        return bot.sendMessage(chatId, `Вы никуда не записаны`);

      return bot.sendMessage(
        chatId,
        `Очереди где записан @${userTag}: \n\n${myQueues.join(
          "\n"
        )}\n\n*Выведет максимум 10*`
      );
    }

    if (data === "lookMyOwnQueues") {
      const cursor = await queuesCollection
        .find({ creatorId: userId })
        .limit(10);

      const myQueues = [];

      await cursor.forEach(function (obj) {
        myQueues.push(obj["name"]);
      });

      if (!myQueues.length)
        return bot.sendMessage(chatId, `Вы не создали ни 1 очереди`);

      return bot.sendMessage(
        chatId,
        `Созданные @${userTag} очереди: \n\n${myQueues.join(
          "\n"
        )}\n\n*Выведет максимум 10*`
      );
    }
  });
};

start();

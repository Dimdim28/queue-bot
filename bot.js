const { MongoClient } = require("mongodb");
const TelegramApi = require("node-telegram-bot-api");
const { addMeToQueueOptions, LookMyQueuesOptions } = require("./options");
require("dotenv").config();

const token = process.env.tgToken;
const url = process.env.dbToken;
const bot = new TelegramApi(token, { polling: true });
const client = new MongoClient(url);

// // Database Name
const dbName = "queueBotBase";
const db = client.db(dbName);
const queuesCollection = db.collection("queues");

const botData = {
  tag: "@queue_im_bot",
  commandsInfo: [
    "/start  -  поздороваться с ботом ",
    "/info  -  посмотреть информацию о боте",
    "/help  -  посмотреть эту подсказку",
    "/new name   -   создать очередь с именем name (создается пустой, появляются кнопки для работы с ней)",
    "/delete name   -   удалить очередь с именем name (может только создатель очереди)",
    "/viewmyqueues  -  вызвать меню с кнопками для просмотра очередей где пользователь записан или очередей которые он создал",
    "/find partOfName -  найти очередь в имени которой есть partOfName",
    "/look name  -  посмотреть на очередь name",
  ],
};

const getQueueName = (text, command) => {
  let queueName = text.replace(command, "");
  if (queueName.includes(botData.tag)) {
    queueName = queueName.replace(botData.tag, "");
  }
  queueName = queueName.trim();
  return queueName;
};

const getCommandName = (text) => {
  if (text.includes(botData.tag)) {
    return text.slice(0, text.indexOf(botData.tag));
  }
  const commands = botData.commandsInfo.map((line) => line.split(" ")[0]);
  for (const command of commands) {
    if (text.includes(command)) {
      return command;
    }
  }
};

const PARAMS = new Map([
  ["/start", ["chatId"]],
  ["/help", ["chatId"]],
  ["/info", ["chatId"]],
  ["/viewmyqueues", ["chatId"]],
  ["/new", ["text", "chatId", "userId"]],
  ["/look", ["text", "chatId"]],
  ["/find", ["text", "chatId"]],
  ["/delete", ["text", "chatId", "userId"]],
]);

const onCommand = {
  async start(chatId) {
    return bot.sendMessage(chatId, "Вас приветствует queue_bot =)");
  },

  async help(chatId) {
    return bot.sendMessage(
      chatId,
      `список команд:\n\n${botData.commandsInfo.join("\n")}`
    );
  },

  async info(chatId) {
    return bot.sendMessage(
      chatId,
      "Бот, разработанный D_im0N и Nailggy для создания очередей и работы с ними =)"
    );
  },

  async viewmyqueues(chatId) {
    const options = LookMyQueuesOptions();
    return bot.sendMessage(chatId, `Какие очереди интересуют?`, options);
  },

  async new(text, chatId, userId) {
    const queueName = getQueueName(text, "/new");
    const addToQueueOptions = addMeToQueueOptions(queueName);

    if (!queueName) {
      return bot.sendMessage(chatId, "Введите название очереди после /new");
    }

    const nameFromQueue = await queuesCollection.findOne({
      name: queueName,
    });

    if (!!nameFromQueue) {
      return bot.sendMessage(
        chatId,
        "очередь с таким названием уже есть!",
        addToQueueOptions
      );
    }

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
  },

  async look(text, chatId) {
    const queueName = getQueueName(text, "/look");
    const addToQueueOptions = addMeToQueueOptions(queueName);

    if (!queueName) {
      return bot.sendMessage(chatId, "Введите название очереди после /look");
    }
    const nameFromQueue = await queuesCollection.findOne({
      name: queueName,
    });

    if (!nameFromQueue) {
      return bot.sendMessage(chatId, `очереди  ${queueName} не существует!`);
    }

    return bot.sendMessage(chatId, `очередь ${queueName}:`, addToQueueOptions);
  },

  async find(text, chatId) {
    const queueName = getQueueName(text, "/find");
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

    if (!myQueues.length) {
      return bot.sendMessage(chatId, "ничего не найдено");
    }

    return bot.sendMessage(
      chatId,
      `Найденные очереди : \n\n${myQueues.join("\n")}\n\n*Выведет максимум 10*`
    );
  },

  async delete(text, chatId, userId) {
    const queueName = getQueueName(text, "/delete");
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
  },

  async addMeToQUeue(data, chatId, userId, userTag) {
    const queueName = data.replace("addMeToQueue:", "");
    const queue = await queuesCollection.findOne({
      name: queueName,
    });
    if (!queue) {
      return bot.sendMessage(chatId, `Очереди уже не существует!`);
    }

    const userInQueue = await queuesCollection.findOne({
      name: queueName,
      people: { $elemMatch: { id: userId, tag: userTag } },
    });
    if (!!userInQueue) {
      return bot.sendMessage(chatId, `Вы уже в очереди`);
    }

    await queuesCollection.updateOne(
      { name: queueName },
      { $push: { people: { id: userId, tag: userTag } } }
    );
    return bot.sendMessage(
      chatId,
      `@${userTag} записался в очередь ${queueName} `
    );
  },
  async viewQueue(data, chatId) {
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
  },
  async tagNext(data, chatId, userId) {
    const at = "@";
    const queueName = data.replace("tagNext:", "");
    const queue = await queuesCollection.findOne({
      name: queueName,
    });
    if (!queue)
      return bot.sendMessage(chatId, `Очередь ${queueName} не существует!`);

    const people = queue.people;
    if (!people.length)
      return bot.sendMessage(chatId, `Очередь ${queueName} сейчас пустая`);

    const firstInQueueId = people[0].id;
    if (userId !== firstInQueueId && userId !== queue.creatorId)
      return bot.sendMessage(
        chatId,
        `Эту команду может выполнять только первый в очереди или создатель`
      );

    await bot.sendMessage(
      chatId,
      `${at + people[0].tag} вышел из очереди ${queueName}\n\n` +
        `Следующий: ${people[1] ? at + people[1].tag : "-"}\n` +
        `Готовится: ${people[2] ? at + people[2].tag : "-"}`
    );

    await queuesCollection.updateOne(
      { name: queueName },
      { $pull: { people: { id: people[0].id, tag: people[0].tag } } }
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
  },
  async removemeFromQueue(data, chatId, userId, userTag) {
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
      return bot.sendMessage(chatId, `Вы не записаны в очередь ${queueName} `);
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
  },
  async lookMyQueues(chatId, userId, userTag) {
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
  },
  async lookMyOwnQueues(chatId, userId, userTag) {
    const cursor = await queuesCollection.find({ creatorId: userId }).limit(10);

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
  },
};

const start = () => {
  client.connect();

  bot.setMyCommands([
    { command: "/start", description: "Запустить бота" },
    { command: "/info", description: "Посмотреть инфу о боте" },
    { command: "/help", description: "Команды для работы с очередями" },
    { command: "/viewmyqueues", description: "Посмотреть мои очереди" },
  ]);

  bot.on("message", async (msg) => {
    if (!msg.text) return;
    if (!msg.text.startsWith("/")) return;

    const values = {
      text: msg.text,
      chatId: msg.chat.id,
      userId: msg.from.id,
    };

    const command = getCommandName(values.text);
    if (command) {
      const params = PARAMS.get(command);
      if (!params) return;
      const valuesArray = params.map((param) => values[param]);
      const func = command.replace("/", "");
      return await onCommand[func](...valuesArray);
    }
    return;
  });

  bot.on("callback_query", async (msg) => {
    const data = msg.data;
    const from = msg.from;
    const userId = from.id;
    const userTag = from.username;
    const chatId = msg.message.chat.id;

    if (data.startsWith("addMeToQueue:")) {
      onCommand.addMeToQUeue(data, chatId, userId, userTag);
    }

    if (data.startsWith("viewQueue:")) {
      onCommand.viewQueue(data, chatId);
    }

    if (data.startsWith("tagNext:")) {
      onCommand.tagNext(data, chatId, userId);
    }

    if (data.startsWith("removeMeFromQueue:")) {
      onCommand.removemeFromQueue(data, chatId, userId, userTag);
    }

    if (data === "lookMyQueues") {
      onCommand.lookMyQueues(chatId, userId, userTag);
    }

    if (data === "lookMyOwnQueues") {
      onCommand.lookMyOwnQueues(chatId, userId, userTag);
    }
  });
};

try {
  start();
} catch (error) {
  console.log(error);
}

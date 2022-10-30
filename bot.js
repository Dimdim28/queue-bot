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
    "/start  -  привітатися із ботом",
    "/info  -  подивитися інформацію про бота",
    "/help  -  подивитися цю підказку",
    "/new name   -   створити чергу з ім'ям name (створюється пустою, нижче з'являються кнопки для взаємодії з нею)",
    "/delete name   -   видалити чергу з ім'ям name (може тільки той, хто створив чергу)",
    "/viewmyqueues  -  викликати меню з кнопками для перегляду черг, де користувач записаний, або черг, які він створив",
    "/find partOfName -  знайти чергу в імені якої є partOfName",
    "/look name  -  подивитися чергу з ім'ям name",
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
    const noTagCommand = text.slice(1, text.indexOf(botData.tag));
    return noTagCommand;
  }
  const commands = botData.commandsInfo.map((line) => line.split(" ")[0]);
  for (const command of commands) {
    if (text.startsWith(command)) {
      return command.replace("/", "");
    }
  }
};

const getDataOptions = (data) => data.split(":");

const checkForQueueName = (text, command, chatId) => {
  const queueName = getQueueName(text, command);
  if (queueName) return queueName;
  bot.sendMessage(chatId, `Введіть назву черги після ${command}`);
  return null;
};

const PARAMS = new Map([
  ["start", ["chatId"]],
  ["help", ["chatId"]],
  ["info", ["chatId"]],
  ["viewmyqueues", ["chatId"]],
  ["new", ["text", "chatId", "userId"]],
  ["look", ["text", "chatId"]],
  ["find", ["text", "chatId"]],
  ["delete", ["text", "chatId", "userId"]],

  ["addMeToQueue", ["queueName", "chatId", "userId", "userTag"]],
  ["viewQueue", ["queueName", "chatId"]],
  ["tagNext", ["queueName", "chatId", "userId"]],
  ["removeMeFromQueue", ["queueName", "chatId", "userId", "userTag"]],
  ["lookMyQueues", ["chatId", "userId", "userTag"]],
  ["lookMyOwnQueues", ["chatId", "userId", "userTag"]],
]);

const onCommand = {
  async start(chatId) {
    return bot.sendMessage(chatId, "Вас вітає queue_bot =)");
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
      "Це бот, розроблений D_im0N и Nailggy для створення черг і роботи з ними"
    );
  },

  async viewmyqueues(chatId) {
    const options = LookMyQueuesOptions();
    return bot.sendMessage(chatId, `Які черги цікавлять?`, options);
  },

  async new(text, chatId, userId) {
    const queueName = checkForQueueName(text, "/new", chatId);
    if (!queueName) return;

    const addToQueueOptions = addMeToQueueOptions(queueName);

    const nameFromQueue = await queuesCollection.findOne({
      name: queueName,
    });

    if (!!nameFromQueue) {
      return bot.sendMessage(
        chatId,
        "Черга з такою назвою вже існує!",
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
      `Чергу ${queueName} створено`,
      addToQueueOptions
    );
  },

  async look(text, chatId) {
    const queueName = checkForQueueName(text, "/look", chatId);
    if (!queueName) return;

    const addToQueueOptions = addMeToQueueOptions(queueName);
    const nameFromQueue = await queuesCollection.findOne({
      name: queueName,
    });

    if (!nameFromQueue) {
      return bot.sendMessage(chatId, `Черги ${queueName} не існує!`);
    }

    return bot.sendMessage(chatId, `Черга ${queueName}:`, addToQueueOptions);
  },

  async find(text, chatId) {
    const queueName = checkForQueueName(text, "/find", chatId);
    if (!queueName) return;

    const expr = new RegExp(queueName, "i");
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
      return bot.sendMessage(chatId, "Нічого не знайдено");
    }

    return bot.sendMessage(
      chatId,
      `Знайдені черги: \n\n${myQueues.join("\n")}\n\n*Макс. 10*`
    );
  },

  async delete(text, chatId, userId) {
    const queueName = checkForQueueName(text, "/delete", chatId);
    if (!queueName) return;

    const nameFromQueue = await queuesCollection.findOne({
      name: queueName,
      creatorId: userId,
    });
    if (!nameFromQueue)
      return bot.sendMessage(
        chatId,
        "Ви не створювали цю чергу або черги з такою назвою вже не існує!"
      );

    await queuesCollection.deleteOne({
      name: queueName,
    });
    return bot.sendMessage(chatId, `Чергу ${queueName} видалено`);
  },

  async addMeToQueue(queueName, chatId, userId, userTag) {
    const queue = await queuesCollection.findOne({
      name: queueName,
    });
    if (!queue) {
      return bot.sendMessage(chatId, `Черги вже не існує!`);
    }

    const userInQueue = await queuesCollection.findOne({
      name: queueName,
      people: { $elemMatch: { id: userId, tag: userTag } },
    });
    if (!!userInQueue) {
      return bot.sendMessage(chatId, `Ви вже у цій черзі`);
    }

    await queuesCollection.updateOne(
      { name: queueName },
      { $push: { people: { id: userId, tag: userTag } } }
    );
    return bot.sendMessage(
      chatId,
      `@${userTag} записався у чергу ${queueName} `
    );
  },

  async viewQueue(queueName, chatId) {
    const queue = await queuesCollection.findOne({
      name: queueName,
    });
    if (!queue) return bot.sendMessage(chatId, `Черги ${queueName} не існує!`);
    const people = queue.people;
    if (!people.length)
      return bot.sendMessage(chatId, `Черга ${queueName} зараз пуста`);

    return bot.sendMessage(
      chatId,
      `Назва черги: ${queueName}\n\n${people
        .map((member, index) => `${++index}: ${member.tag}`)
        .join("\n")}`
    );
  },

  async tagNext(queueName, chatId, userId) {
    const queue = await queuesCollection.findOne({
      name: queueName,
    });
    if (!queue) return bot.sendMessage(chatId, `Черги ${queueName} не існує!`);

    const people = queue.people;
    if (!people.length)
      return bot.sendMessage(chatId, `Черга ${queueName} зараз пуста`);

    const firstInQueueId = people[0].id;
    if (userId !== firstInQueueId && userId !== queue.creatorId)
      return bot.sendMessage(
        chatId,
        `Цю команду може виконути лише перший у черзі або той, хто її створював!`
      );

    await bot.sendMessage(
      chatId,
      `${"@" + people[0].tag} покинув чергу ${queueName}\n\n` +
        `Наступний: ${people[1] ? "@" + people[1].tag : "-"}\n` +
        `Готується: ${people[2] ? "@" + people[2].tag : "-"}`
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
      return bot.sendMessage(
        chatId,
        `Черга ${queueName} стала пустою, тому її видалено`
      );
    }
  },

  async removeMeFromQueue(queueName, chatId, userId, userTag) {
    const queue = await queuesCollection.findOne({
      name: queueName,
      people: { $elemMatch: { id: userId, tag: userTag } },
    });

    if (!queue) {
      const queueTest = await queuesCollection.findOne({
        name: queueName,
      });
      if (!queueTest)
        return bot.sendMessage(chatId, `Черги ${queueName} не існує!`);
      return bot.sendMessage(chatId, `Ви не записані у чергу ${queueName}`);
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
      return bot.sendMessage(
        chatId,
        `Черга ${queueName} стала пустою, тому її видалено`
      );
    }

    return bot.sendMessage(chatId, `@${userTag} виписався з черги`);
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
      return bot.sendMessage(chatId, `Ви нікуди не записані`);

    return bot.sendMessage(
      chatId,
      `Черги, де записаний @${userTag}: \n\n${myQueues.join(
        "\n"
      )}\n\n*Макс. 10*`
    );
  },

  async lookMyOwnQueues(chatId, userId, userTag) {
    const cursor = await queuesCollection.find({ creatorId: userId }).limit(10);

    const myQueues = [];

    await cursor.forEach(function (obj) {
      myQueues.push(obj["name"]);
    });

    if (!myQueues.length)
      return bot.sendMessage(chatId, `Ви не створили жодної черги`);

    return bot.sendMessage(
      chatId,
      `Створені @${userTag} черги: \n\n${myQueues.join("\n")}\n\n*Макс. 10*`
    );
  },
};

const callFunctionWithParams = (command, params, values) => {
  const commandParams = params.get(command);
  if (!commandParams) return;
  const valuesArray = commandParams.map((param) => values[param]);
  return onCommand[command](...valuesArray);
};

const start = () => {
  client.connect();

  bot.setMyCommands([
    { command: "/start", description: "Запустити бота" },
    { command: "/info", description: "Подивитися інформацію про бота" },
    { command: "/help", description: "Команди для роботи з чергами" },
    { command: "/viewmyqueues", description: "Подивитися мої черги" },
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
      callFunctionWithParams(command, PARAMS, values);
    }
    return;
  });

  bot.on("callback_query", async (msg) => {
    const data = getDataOptions(msg.data);
    const command = data[0];
    const queueName = data[1];

    const from = msg.from;
    const userId = from.id;
    const userTag = from.username;
    const chatId = msg.message.chat.id;

    const values = { command, queueName, from, userId, userTag, chatId };
    callFunctionWithParams(command, PARAMS, values);
    return;
  });
};

try {
  start();
} catch (error) {
  console.log(error);
}

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

const findQueue = (queueName) =>
  queuesCollection.findOne({
    name: queueName,
  });

const findQueueWithUser = (queueName, userId) =>
  queuesCollection.findOne({
    name: queueName,
    people: { $elemMatch: { id: userId } },
  });

const findQueueWithOwner = (queueName, userId) =>
  queuesCollection.findOne({
    name: queueName,
    creatorId: userId,
  });

const deleteQueue = (queueName) =>
  queuesCollection.deleteOne({
    name: queueName,
  });

const createQueue = (queueName, userId) =>
  queuesCollection.insertOne({
    name: queueName,
    people: [],
    creatorId: userId,
  });

const addToQueue = (queueName, userId, userTag) =>
  queuesCollection.updateOne(
    { name: queueName },
    { $push: { people: { id: userId, tag: userTag } } }
  );

const removeFromQueue = (queueName, userId) =>
  queuesCollection.updateOne(
    { name: queueName },
    { $pull: { people: { id: userId } } }
  );

const getCursor = (properties, limit) =>
  queuesCollection.find(properties).limit(limit);

const PARAMS = new Map([
  ["start", ["chatId"]],
  ["help", ["chatId"]],
  ["info", ["chatId"]],
  ["viewmyqueues", ["chatId"]],
  ["new", ["queueName", "chatId", "userId"]],
  ["look", ["queueName", "chatId"]],
  ["find", ["queueName", "chatId", "queuesLimit"]],
  ["delete", ["queueName", "chatId", "userId"]],

  ["addMeToQueue", ["queueName", "chatId", "userId", "userTag"]],
  ["viewQueue", ["queueName", "chatId"]],
  ["tagNext", ["queueName", "chatId", "userId"]],
  ["removeMeFromQueue", ["queueName", "chatId", "userId", "userTag"]],
  ["lookMyQueues", ["chatId", "userId", "userTag", "queuesLimit"]],
  ["lookMyOwnQueues", ["chatId", "userId", "userTag", "queuesLimit"]],
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

  async new(queueName, chatId, userId) {
    if (!queueName) {
      bot.sendMessage(chatId, "Ви не ввели назву черги!")
    }
    const addToQueueOptions = addMeToQueueOptions(queueName);
    const queue = await findQueue(queueName);
    if (!!queue) {
      return bot.sendMessage(
        chatId,
        "Черга з такою назвою вже існує!",
        addToQueueOptions
      );
    }

    await createQueue(queueName, userId);
    return bot.sendMessage(
      chatId,
      `Чергу ${queueName} створено`,
      addToQueueOptions
    );
  },

  async look(queueName, chatId) {
    if (!queueName) {
      bot.sendMessage(chatId, "Ви не ввели назву черги!")
    }
    const addToQueueOptions = addMeToQueueOptions(queueName);
    const queue = await findQueue(queueName);
    if (!queue) {
      return bot.sendMessage(chatId, `Черги ${queueName} не існує!`);
    }
    return bot.sendMessage(chatId, `Черга ${queueName}:`, addToQueueOptions);
  },

  async find(queueName, chatId, queuesLimit) {
    if (!queueName) {
      bot.sendMessage(chatId, "Ви не ввели назву черги!")
    }
    const expr = new RegExp(queueName, "i");
    const myQueues = [];
    const cursor = await getCursor({ name: { $regex: expr } }, queuesLimit);
    await cursor.forEach(function (obj) {
      myQueues.push(obj["name"]);
    });
    if (!myQueues.length) {
      return bot.sendMessage(chatId, "Нічого не знайдено");
    }
    return bot.sendMessage(
      chatId,
      `Знайдені черги: \n\n${myQueues.join("\n")}\n\n*Макс. ${queuesLimit}*`
    );
  },

  async delete(queueName, chatId, userId) {
    if (!queueName) {
      bot.sendMessage(chatId, "Ви не ввели назву черги!")
    }
    const queue = await findQueueWithOwner(queueName, userId);
    if (!queue)
      return bot.sendMessage(
        chatId,
        "Ви не створювали цю чергу або черги з такою назвою вже не існує!"
      );
    await deleteQueue(queueName);
    return bot.sendMessage(chatId, `Чергу ${queueName} видалено`);
  },

  async addMeToQueue(queueName, chatId, userId, userTag) {
    const queue = await findQueue(queueName);
    if (!queue) {
      return bot.sendMessage(chatId, `Черги вже не існує!`);
    }
    const userInQueue = await findQueueWithUser(queueName, userId);
    if (userInQueue) {
      return bot.sendMessage(chatId, `Ви вже у цій черзі`);
    }
    await addToQueue(queueName, userId, userTag);
    return bot.sendMessage(
      chatId,
      `@${userTag} записався у чергу ${queueName} `
    );
  },

  async viewQueue(queueName, chatId) {
    const queue = await findQueue(queueName);
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
    const queue = await findQueue(queueName);
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
    const firstMember = people[0];
    await removeFromQueue(queueName, firstMember.id, firstMember.tag);
    const checkingQueue = await findQueue(queueName);
    if (!checkingQueue.people.length) {
      await deleteQueue(queueName);
      return bot.sendMessage(
        chatId,
        `Черга ${queueName} стала пустою, тому її видалено`
      );
    }
  },

  async removeMeFromQueue(queueName, chatId, userId, userTag) {
    const queue = await findQueueWithUser(queueName, userId);
    if (!queue) {
      const queueTest = await findQueue(queueName);
      if (!queueTest) {
        return bot.sendMessage(chatId, `Черги ${queueName} не існує!`);
      }
        
      return bot.sendMessage(chatId, `Ви не записані у чергу ${queueName}`);
    }
    await removeFromQueue(queueName, userId);
    const checkingQueue = await findQueue(queueName);
    if (!!checkingQueue) {
      await deleteQueue(queueName);
      return bot.sendMessage(
        chatId,
        `Черга ${queueName} стала пустою, тому її видалено`
      );
    }
    return bot.sendMessage(chatId, `@${userTag} виписався з черги`);
  },

  async lookMyQueues(chatId, userId, userTag, queuesLimit) {
    const cursor = await getCursor({ people: { id: userId } }, queuesLimit);
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
      )}\n\n*Макс. ${queuesLimit}*`
    );
  },

  async lookMyOwnQueues(chatId, userId, userTag, queuesLimit) {
    const cursor = await getCursor({ creatorId: userId }, queuesLimit);
    const myQueues = [];
    await cursor.forEach(function (obj) {
      myQueues.push(obj["name"]);
    });
    if (!myQueues.length)
      return bot.sendMessage(chatId, `Ви не створили жодної черги`);
    return bot.sendMessage(
      chatId,
      `Створені @${userTag} черги: \n\n${myQueues.join("\n")}\n\n*Макс. ${queuesLimit}*`
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

    const text = msg.text;
    const commandName = getCommandName(text);
    const command = "/" + commandName;
    const queueName = getQueueName(text, command);
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const queuesLimit = 10;
    
    const values = {queueName, chatId, userId, queuesLimit };

    
    if (commandName) {
      callFunctionWithParams(commandName, PARAMS, values);
    }
    return;
  });

  bot.on("callback_query", async (msg) => {
    const data = getDataOptions(msg.data);
    const commandName = data[0];
    const queueName = data[1];

    const from = msg.from;
    const userId = from.id;
    const userTag = from.username;
    const chatId = msg.message.chat.id;
    const queuesLimit = 10;

    const values = { queueName, userId, userTag, chatId, queuesLimit };
    callFunctionWithParams(commandName, PARAMS, values);
    return;
  });
};

try {
  start();
} catch (error) {
  console.log(error);
}

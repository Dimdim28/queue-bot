const TelegramApi = require("node-telegram-bot-api");
const { queues, connectMongoClient } = require("./mongo");
const { addMeToQueueOptions, LookMyQueuesOptions } = require("./options");

const token = process.env.tgToken;
const bot = new TelegramApi(token, { polling: true });
const queuesCollection = new queues("queues");

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

const checker = {
  error: "",

  get errorMsg() {
    const tempErrorMsg = this.error;
    this.error = "";
    return tempErrorMsg;
  },

  set errorMsg(error) {
    this.error = error;
  },

  isTrue(obj, errorMsg) {
    if(!obj && !this.error) {
      this.error = errorMsg;
    }
    return this;
  },

  isFalse(obj, errorMsg) {
    if(obj && !this.error) {
      this.error = errorMsg;
    }
    return this;
  },
};

const queueNameChecker = (queueName) => {
  if (!queueName) {
    return "Ви не ввели назву черги!";
  }

  if (/[\}\{\/\?\.\>\<\|\\\~\!\@\#\$\^\&\*\(\)\-\+\[\]]+/.test(queueName))
    return "Символи { } [ ] / ? . > <  |  ~ ! @ # $ ^ ; : & * () + - недопустимі ";
};

const PARAMS = new Map([
  ["start", ["chatId"]],
  ["help", ["chatId"]],
  ["info", ["chatId"]],
  ["viewmyqueues", ["chatId"]],
  ["new", ["queueName", "chatId", "userId"]],
  ["look", ["queueName", "chatId"]],
  ["find", ["queueName", "chatId", "queuesLimit"]],
  ["delete", ["queueName", "chatId", "userId", "userTag"]],

  ["addMeToQueue", ["queueName", "chatId", "userId", "userTag"]],
  ["viewQueue", ["queueName", "chatId"]],
  ["tagNext", ["queueName", "chatId", "userId", "userTag"]],
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
    const queueNameError = queueNameChecker(queueName);
    if (queueNameError) return bot.sendMessage(chatId, queueNameError);

    const queue = await queuesCollection.findQueue(queueName);
    const addToQueueOptions = addMeToQueueOptions(queueName);

    const error = checker
    .isFalse(queue, `Черга з назвою ${queueName} вже існує!`)
    .errorMsg;
    if (error) {
      return bot.sendMessage(chatId, error, addToQueueOptions);
    }

    await queuesCollection.createQueue(queueName, userId);
    return bot.sendMessage(chatId, 
      `Чергу ${queueName} створено`, 
      addToQueueOptions
    );
  },

  async look(queueName, chatId) {
    const queueNameError = queueNameChecker(queueName);
    if (queueNameError) return bot.sendMessage(chatId, queueNameError);
    
    const queue = await queuesCollection.findQueue(queueName);
    const addToQueueOptions = addMeToQueueOptions(queueName);

    const error = checker
    .isTrue(queue, `Черги ${queueName} вже не існує!`)
    .errorMsg;
    if (error) {
      return bot.sendMessage(chatId, error);
    }

    return bot.sendMessage(chatId, `Черга ${queueName}:`, addToQueueOptions);
  },

  async find(queueName, chatId, queuesLimit) {
    const queueNameError = queueNameChecker(queueName);
    if (queueNameError) return bot.sendMessage(chatId, queueNameError);

    const expr = new RegExp(queueName, "i");
    const myQueues = [];
    const cursor = await queuesCollection.getCursor(
      { name: { $regex: expr } },
      queuesLimit
    );
    await cursor.forEach(function (obj) {
      myQueues.push(obj["name"]);
    });

    const error = checker
    .isTrue(myQueues.length, "Нічого не знайдено")
    .errorMsg;
    if (error) {
      return bot.sendMessage(chatId, error);
    }

    return bot.sendMessage(
      chatId,
      `Знайдені черги: \n\n${myQueues.join("\n")}\n\n*Макс. ${queuesLimit}*`
    );
  },

  async delete(queueName, chatId, userId, userTag) {
    const queueNameError = queueNameChecker(queueName);
    if (queueNameError) return bot.sendMessage(chatId, queueNameError);

    const queue = await queuesCollection.findQueue(queueName);
    const queueWithOwner = await queuesCollection.findQueueWithOwner(queueName, userId);

    const error = checker
    .isTrue(queue, `Черги ${queueName} не існує!`)
    .isTrue(queueWithOwner, `@${userTag}, ви не створювали цю чергу`)
    .errorMsg;
    if (error) {
      return bot.sendMessage(chatId, error);
    }
    
    await queuesCollection.deleteQueue(queueName);
    return bot.sendMessage(
      chatId,
      `@${userTag}, чергу ${queueName} успішно видалено`
    );
  },

  async addMeToQueue(queueName, chatId, userId, userTag) {
    const queue = await queuesCollection.findQueue(queueName);
    const userInQueue = await queuesCollection
    .findQueueWithUser(queueName, userId);

    const error = checker
    .isTrue(queue, `Черги ${queueName} вже не існує!`)
    .isFalse(userInQueue, `@${userTag}, ви вже у цій черзі`)
    .errorMsg;

    if (error) {
      return bot.sendMessage(chatId, error);
    }

    await queuesCollection.addToQueue(queueName, userId, userTag);
    return bot.sendMessage(
      chatId,
      `@${userTag} записався у чергу ${queueName} `
    );
  },

  async viewQueue(queueName, chatId) {
    const queue = await queuesCollection.findQueue(queueName);
    const people = queue?.people;
 
    
    const error = checker
    .isTrue(queue, `Черги ${queueName} вже не існує!`)
    .isTrue(people?.length, `Черга ${queueName} зараз пуста`)
    .errorMsg;
    if (error) {
      return bot.sendMessage(chatId, error);
    }

    return bot.sendMessage(
      chatId,
      `Назва черги: ${queueName}\n\n${people
        .map((member, index) => `${++index}: ${member.tag}`)
        .join("\n")}`
    );
  },

  async tagNext(queueName, chatId, userId, userTag) {
    const queue = await queuesCollection.findQueue(queueName);
    const people = queue?.people;
    const firstInQueueId = people ? people[0]?.id : undefined;
    const isFirstOrCreator = 
    (userId === firstInQueueId) 
    || (userId === queue?.creatorId);

    

    const error = checker
    .isTrue(queue, `Черги ${queueName} вже не існує!`)
    .isTrue(people?.length, `Черга ${queueName} зараз пуста`)
    .isTrue(isFirstOrCreator, 
      `@${userTag}, цю команду може виконути лише перший у черзі або той, хто її створював!`)
    .errorMsg;
    if (error) {
      return bot.sendMessage(chatId, error);
    }

    const firstMember = people[0]; 
    const firstTag = firstMember.tag; // first will be for sure
    const nextMember = people[1];
    const nextTag = nextMember?.tag; // next may be undefined

    if(!nextMember) {
      await queuesCollection.deleteQueue(queueName);
      return bot.sendMessage(
        chatId, 
        `${firstTag} останнім покинув чергу ${queueName}, тому її видалено`
      );
    }

    await queuesCollection.removeFromQueue(queueName, firstInQueueId);
    return bot.sendMessage(
      chatId,
      `${"@" + firstTag} покинув чергу ${queueName}\n`
       + `Наступний у черзі: @${nextTag}`
    );
  },

  async removeMeFromQueue(queueName, chatId, userId, userTag) {
    const queue = await queuesCollection.findQueue(queueName);
    const queueWithUser = await queuesCollection
    .findQueueWithUser(queueName, userId);
    
    const error = checker
    .isTrue(queue, `Черги ${queueName} вже не існує!`)
    .isTrue(queueWithUser, `@${userTag}, ви не записані у чергу ${queueName}`)
    .errorMsg;
    if (error) {
      return bot.sendMessage(chatId, error);
    }

    const numOfPeople = queueWithUser.people.length;
    if (numOfPeople === 1) {
      await queuesCollection.deleteQueue(queueName);
      return bot.sendMessage(
        chatId, 
        `${userTag} останнім покинув чергу ${queueName}, тому її видалено`
      );
    }
    
    await queuesCollection.removeFromQueue(queueName, userId);
    return bot.sendMessage(chatId, `@${userTag} виписався з черги`);
  },

  async lookMyQueues(chatId, userId, userTag, queuesLimit) {
    const cursor = await queuesCollection.getCursor(
      { people: { $elemMatch: { id: userId } } },
      queuesLimit
    );
    const myQueues = [];
    await cursor.forEach(function (obj) {
      myQueues.push(obj["name"]);
    });

    const error = checker
    .isTrue(myQueues.length, `@${userTag}, Ви нікуди не записані`)
    .errorMsg;
    if (error) {
      return bot.sendMessage(chatId, error);
    }

    return bot.sendMessage(
      chatId,
      `Черги, де записаний @${userTag}: \n\n${myQueues.join(
        "\n"
      )}\n\n*Макс. ${queuesLimit}*`
    );
  },

  async lookMyOwnQueues(chatId, userId, userTag, queuesLimit) {
    const cursor = await queuesCollection.getCursor(
      { creatorId: userId },
      queuesLimit
    );
    const myQueues = [];
    await cursor.forEach(function (obj) {
      myQueues.push(obj["name"]);
    });

    const error = checker
    .isTrue(myQueues.length, `@${userTag}, Ви не створили жодної черги`)
    .errorMsg;
    if (error) {
      return bot.sendMessage(chatId, error);
    }

    return bot.sendMessage(
      chatId,
      `Створені @${userTag} черги: \n\n${myQueues.join(
        "\n"
      )}\n\n*Макс. ${queuesLimit}*`
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
  connectMongoClient();
  bot.setMyCommands([
    { command: "/start", description: "Запустити бота" },
    { command: "/info", description: "Подивитися інформацію про бота" },
    { command: "/help", description: "Команди для роботи з чергами" },
    { command: "/viewmyqueues", description: "Подивитися мої черги" },
  ]);

  bot.on("message", async (msg) => {
    if (!msg.text) return;
    if (!msg.text.startsWith("/")) return;
    console.log(msg);
    const text = msg.text;
    const commandName = getCommandName(text);
    const command = "/" + commandName;
    const queueName = getQueueName(text, command);
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userTag = msg.from.username;
    const queuesLimit = 10;

    const values = { queueName, chatId, userId, queuesLimit, userTag };

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

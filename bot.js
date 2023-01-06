const TelegramApi = require("node-telegram-bot-api");
const {
  Queues,
  Versions,
  Chats,
  connectMongoClient,
  Admins,
} = require("./mongo");
const {
  getDataOptions,
  callFunctionWithArgs,
  getValuesFromMessage,
} = require("./helpers");

const { Executor } = require("./onCommand");

const token = process.env.tgToken;
const bot = new TelegramApi(token, { polling: true });
const queuesCollection = new Queues("queues");
const versionCollection = new Versions("versions");
const chatsCollection = new Chats("chats");
const adminsCollection = new Admins("admins");
const versionTypes = ["major", "minor", "patch"];

const botData = {
  tag: "@queue_im_bot",
  botId: 5794761816,
  commandsInfo: {
    owner: new Map([
      [
        "/addAdmin",
        " customerId  -  дати права адміна користувачу з айді customerId",
      ],
      [
        "/removeAdmin",
        " customerId  -  забрати права адміна у користувача з айді customerId",
      ],
      [
        "/addOwner",
        " customerId  -  додати права розробника користувачу з айді customerId",
      ],
      [
        "/removeOwner",
        " customerId  -  забрати права розробника у користувача з айді customerId",
      ],
      [
        "/removeFromCustomers",
        " customerId  -  відмовити у наданні особливих прав користувачу з айді customerId",
      ],
      ["/viewCustomers", "  -  подивитись список запитів на отримання прав"],
      ["/viewAdmins", "  -  подивитись список адмінів"],
      ["/viewOwners", "  -  подивитись список розробників"],
    ]),
    admin: new Map([
      [
        "/newVersion",
        " description updatesType -  додати інформацію про нову версію боту, updatesType = major, minor або patch - впливає на новий номер версії що буде згенеровано програмою",
      ],
      [
        "/updateVersionDescription",
        " description version  -  змінити інформацію про  версію боту",
      ],
      [
        "/sendInfoAboutVersion",
        " -  надіслати у всі чати повідомлення про нову версію боту",
      ],
      [
        "/sendInfoAboutDeveloping",
        " -  надіслати у всі чати повідомлення про початок технічних робіт",
      ],
    ]),
    common: new Map([
      ["/start", "  -  привітатися із ботом"],
      ["/info", "  -  подивитися інформацію про бота"],
      ["/help", "  -  подивитися цю підказку"],
      [
        "/getVersionInfo",
        " version -  подивитися інформацію про певну версію боту",
      ],
      [
        "/getPreviousVersions",
        " count -  подивитися інформацію про попередні версії боту, count - максимальна калькість версій що виведе(10 за замовчуванням)",
      ],
      [
        "/newQueue",
        " name   -   створити чергу з ім'ям name (створюється пустою, нижче з'являються кнопки для взаємодії з нею)",
      ],
      [
        "/delete",
        " name   -   видалити чергу з ім'ям name (може тільки той, хто створив чергу)",
      ],
      [
        "/viewmyqueues",
        "  -  викликати меню з кнопками для перегляду черг, де користувач записаний, або черг, які він створив",
      ],
      ["/find", " partOfName -  знайти чергу в імені якої є partOfName"],
      ["/look", " name  -  подивитися чергу з ім'ям name"],
      [
        "/addMeToCustomers",
        "  -  надіслати запит на отримання прав адміна або розробника",
      ],
      [
        "/removeMeFromCustomers",
        "  -  відмінити запит на отримання прав адміна або розробника",
      ],
    ]),
  },
};

const executor = new Executor(bot, {
  queuesCollection,
  versionCollection,
  chatsCollection,
  versionTypes,
  adminsCollection,
  botData,
});

const PARAMS = new Map([
  ["start", ["chatId"]],
  ["help", ["chatId", "userId"]],
  ["info", ["chatId"]],
  ["viewmyqueues", ["chatId"]],
  ["newVersion", ["chatId", "userId", "message"]],
  ["updateVersionDescription", ["chatId", "userId", "message"]],
  ["getVersionInfo", ["chatId", "message"]],
  ["getPreviousVersions", ["chatId", "message"]],
  ["sendInfoAboutVersion", ["chatId"]],
  ["sendInfoAboutDeveloping", ["chatId"]],

  ["addAdmin", ["chatId", "userId", "message"]],
  ["removeAdmin", ["chatId", "userId", "message"]],
  ["addOwner", ["chatId", "userId", "message"]],
  ["removeOwner", ["chatId", "userId", "message"]],
  ["removeFromCustomers", ["chatId", "userId", "message"]],
  ["viewCustomers", ["chatId", "userId"]],
  ["viewAdmins", ["chatId", "userId"]],
  ["viewOwners", ["chatId", "userId"]],

  ["addMeToCustomers", ["chatId", "userId", "userTag", "message"]],
  ["removeMeFromCustomers", ["chatId", "userId"]],

  ["newQueue", ["message", "chatId", "userId"]],
  ["look", ["message", "chatId"]],
  ["find", ["message", "chatId", "queuesLimit"]],
  ["delete", ["message", "chatId", "userId", "userTag"]],

  ["addMeToQueue", ["message", "chatId", "userId", "userTag"]],
  ["viewQueue", ["message", "chatId"]],
  ["tagNext", ["message", "chatId", "userId", "userTag"]],
  ["removeMeFromQueue", ["message", "chatId", "userId", "userTag"]],
  ["lookMyQueues", ["chatId", "userId", "userTag", "queuesLimit"]],
  ["lookMyOwnQueues", ["chatId", "userId", "userTag", "queuesLimit"]],

  ["botJoinedToChat", ["chatId"]],
  ["botLeftTheChat", ["chatId"]],
]);

async function start() {
  console.log("bot started");
  let chatIds = [];
  connectMongoClient();
  try {
    const ids = await chatsCollection.getChatIds();
    chatIds = ids.chats.map((obj) => obj.id);
    executor.updateNecessaryValues({ chatIds });
    const admins = await adminsCollection.getAdminsIds();
    await executor.updateNecessaryValues({ creatorsIds: admins });
  } catch (e) {
    console.log(e);
  }
  bot.setMyCommands([
    { command: "/start", description: "Запустити бота" },
    { command: "/info", description: "Подивитися інформацію про бота" },
    { command: "/help", description: "Команди для роботи з чергами" },
    { command: "/viewmyqueues", description: "Подивитися мої черги" },
  ]);

  bot.on("message", async (msg) => {
    const parsedMessage = getValuesFromMessage(msg, botData);
    if (!parsedMessage) return;
    const [commandName, values] = parsedMessage;
    if (commandName) {
      try {
        callFunctionWithArgs(executor, commandName, PARAMS, values);
      } catch (error) {
        console.log(error);
      }
    }
  });

  bot.on("callback_query", async (msg) => {
    const data = getDataOptions(msg.data);
    const [commandName, message] = data;
    const { id, username } = msg.from;
    const chatId = msg.message.chat.id;
    const values = {
      message,
      userId: id,
      userTag: username,
      chatId,
      queuesLimit: 10,
    };
    try {
      callFunctionWithArgs(executor, commandName, PARAMS, values);
    } catch (error) {
      console.log(error);
    }
  });
}

start();

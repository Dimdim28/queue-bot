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
  callFunctionWithParams,
  getValuesFromMessage,
} = require("./helpers");

const { OnCommandClass } = require("./onCommand");

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
    owner: [
      "/addAdmin customerId  -  дати права адміна користувачу з айді customerId",
      "/removeAdmin customerId  -  забрати права адміна у користувача з айді customerId",
      "/addOwner customerId  -  додати права розробника користувачу з айді customerId",
      "/removeOwner customerId  -  забрати права розробника у користувача з айді customerId",
      "/removeFromCustomers customerId  -  відмовити у наданні особливих прав користувачу з айді customerId",
      "/viewCustomers  -  подивитись список запитів на отримання прав",
      "/viewAdmins  -  подивитись список адмінів",
      "/viewOwners  -  подивитись список розробників",
    ],
    admin: [
      "/newVersion description updatesType -  додати інформацію про нову версію боту, updatesType = major, minor або patch - впливає на новий номер версії що буде згенеровано программою  ",
      "/updateVersionDescription description version  -  змінити інформацію про  версію боту",
      "/sendInfoAboutVersion  -  надіслати у всі чати повідомлення про нову версію боту",
      "/sendInfoAboutDeveloping  -  надіслати у всі чати повідомлення про початок технічних робіт",
    ],
    common: [
      "/start  -  привітатися із ботом",
      "/info  -  подивитися інформацію про бота",
      "/help  -  подивитися цю підказку",
      "/getVersionInfo version -  подивитися інформацію про певну версію боту",
      "/getPreviousVersions count -  подивитися інформацію про попередні версії боту, count - максимальна калькість версій що виведе(10 за замовчуванням)",
      "/new name   -   створити чергу з ім'ям name (створюється пустою, нижче з'являються кнопки для взаємодії з нею)",
      "/delete name   -   видалити чергу з ім'ям name (може тільки той, хто створив чергу)",
      "/viewmyqueues  -  викликати меню з кнопками для перегляду черг, де користувач записаний, або черг, які він створив",
      "/find partOfName -  знайти чергу в імені якої є partOfName",
      "/look name  -  подивитися чергу з ім'ям name",
      "/addMeToCustomers  -  надіслати запит на отримання прав адміна або розробника",
      "/removeMeFromCustomers  -  відмінити запит на отримання прав адміна або розробника",
    ],
  },
};

const onCommand = new OnCommandClass(bot, {
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
  ["newVersion", ["chatId", "userId", "versionDescription"]],
  ["updateVersionDescription", ["chatId", "userId", "versionDescription"]],
  ["getVersionInfo", ["chatId", "versionDescription"]],
  ["getPreviousVersions", ["chatId", "versionDescription"]],
  ["sendInfoAboutVersion", ["chatId"]],
  ["sendInfoAboutDeveloping", ["chatId"]],

  ["addAdmin", ["chatId", "userId", "customerId"]],
  ["removeAdmin", ["chatId", "userId", "customerId"]],
  ["addOwner", ["chatId", "userId", "customerId"]],
  ["removeOwner", ["chatId", "userId", "customerId"]],
  ["removeFromCustomers", ["chatId", "userId", "customerId"]],
  ["viewCustomers", ["chatId", "userId"]],
  ["viewAdmins", ["chatId", "userId"]],
  ["viewOwners", ["chatId", "userId"]],

  ["addMeToCustomers", ["chatId", "userId", "userTag", "description"]],
  ["removeMeFromCustomers", ["chatId", "userId"]],

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

  ["botJoinedToChat", ["chatId"]],
  ["botLeftTheChat", ["chatId"]],
]);

async function start() {
  console.log("bot started");
  let chatIds = [],
    creatorsIds = [];
  connectMongoClient();
  try {
    const ids = await chatsCollection.getChatIds();
    chatIds = ids.chats.map((obj) => obj.id);
    onCommand.updateNecessaryValues({ chatIds });
    const admins = await adminsCollection.getAdminsIds();
    if (!admins) {
      await adminsCollection.createAdminsCollection();
      creatorsIds = await adminsCollection.getAdminsIds();
    } else {
      creatorsIds = admins;
    }
    await onCommand.updateNecessaryValues({ creatorsIds });
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
        callFunctionWithParams(onCommand, commandName, PARAMS, values);
      } catch (error) {
        console.log(error);
      }
    }
  });

  bot.on("callback_query", async (msg) => {
    const data = getDataOptions(msg.data);
    const [commandName, queueName] = data;
    const { id, username } = msg.from;
    const chatId = msg.message.chat.id;
    const queuesLimit = 10;
    const values = {
      queueName,
      userId: id,
      userTag: username,
      chatId,
      queuesLimit,
    };
    try {
      callFunctionWithParams(onCommand, commandName, PARAMS, values);
    } catch (error) {
      console.log(error);
    }
  });
}

start();

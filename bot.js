const TelegramApi = require("node-telegram-bot-api");
const { queues, versions, chats, connectMongoClient } = require("./mongo");
const {
  getCommandName,
  getQueueName,
  getVersionDescription,
  getDataOptions,
  callFunctionWithParams,
  isBotLeftGroup,
  isBotJoinedGroup,
} = require("./helpers");

const { onCommandClass } = require("./onCommand");

const token = process.env.tgToken;
const bot = new TelegramApi(token, { polling: true });
const queuesCollection = new queues("queues");
const versionCollection = new versions("versions");
const chatsCollection = new chats("chats");

const creatorsIds = [1098896359, 374131845];
const versionTypes = ["major", "minor", "patch"];

const chatIds = [-870403294];

const botData = {
  tag: "@queue_im_bot",
  botId: 5794761816,
  commandsInfo: [
    "/start  -  привітатися із ботом",
    "/info  -  подивитися інформацію про бота",
    "/help  -  подивитися цю підказку",
    "/newVersion description updatesType -  додати інформацію про нову версію боту, updatesType= major, minor або patch - впливає на новий номер версії що буде згенеровано программою  ",
    "/updateVersionDescription description version  -  змінити інформацію про  версію боту",
    "/getVersionInfo version -  подивитися інформацію про певну версію боту",
    "/getPreviousVersions count -  подивитися інформацію про попередні версії боту, count - максимальна калькість версій що виведе(10 за замовчуванням)",
    "/sendInfoAboutVersion  -  надіслати у всі чати повідомлення про нову версію боту",
    "/new name   -   створити чергу з ім'ям name (створюється пустою, нижче з'являються кнопки для взаємодії з нею)",
    "/delete name   -   видалити чергу з ім'ям name (може тільки той, хто створив чергу)",
    "/viewmyqueues  -  викликати меню з кнопками для перегляду черг, де користувач записаний, або черг, які він створив",
    "/find partOfName -  знайти чергу в імені якої є partOfName",
    "/look name  -  подивитися чергу з ім'ям name",
  ],
};

const onCommand = new onCommandClass(bot, {
  queuesCollection,
  versionCollection,
  chatsCollection,
  creatorsIds,
  versionTypes,
  botData,
  chatIds,
});

const PARAMS = new Map([
  ["start", ["chatId"]],
  ["help", ["chatId"]],
  ["info", ["chatId"]],
  ["viewmyqueues", ["chatId"]],
  ["newVersion", ["chatId", "userId", "versionDescription"]],
  ["updateVersionDescription", ["chatId", "userId", "versionDescription"]],
  ["getVersionInfo", ["chatId", "versionDescription"]],
  ["getPreviousVersions", ["chatId", "versionDescription"]],
  ["sendInfoAboutVersion", ["chatId"]],

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

const start = () => {
  connectMongoClient();
  bot.setMyCommands([
    { command: "/start", description: "Запустити бота" },
    { command: "/info", description: "Подивитися інформацію про бота" },
    { command: "/help", description: "Команди для роботи з чергами" },
    { command: "/viewmyqueues", description: "Подивитися мої черги" },
  ]);

  bot.on("message", async (msg) => {
    //console.log(msg);
    const isBotLeft = isBotLeftGroup(msg, botData.botId);
    const isBotJoined = isBotJoinedGroup(msg, botData.botId);
    const chatId = msg.chat.id;
    if (isBotJoined) {
      try {
        callFunctionWithParams(onCommand, "botJoinedToChat", PARAMS, {
          chatId,
        });
      } catch (error) {
        console.log(error);
      }
      return;
    }

    if (isBotLeft) {
      try {
        callFunctionWithParams(onCommand, "botLeftTheChat", PARAMS, {
          chatId,
        });
      } catch (error) {
        console.log(error);
      }
      return;
    }

    if (!msg.text) return;
    if (!msg.text.startsWith("/")) return;
    const text = msg.text;
    const commandName = getCommandName(text, botData.tag, botData.commandsInfo);
    const command = "/" + commandName;
    const queueName = getQueueName(text, botData.tag, command);
    const versionDescription = getVersionDescription(
      text,
      botData.tag,
      command
    );
    const userId = msg.from.id;
    const userTag = msg.from.username;
    const queuesLimit = 10;

    const values = {
      queueName,
      chatId,
      userId,
      queuesLimit,
      userTag,
      versionDescription,
    };

    if (commandName) {
      try {
        callFunctionWithParams(onCommand, commandName, PARAMS, values);
      } catch (error) {
        console.log(error);
      }
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

    try {
      callFunctionWithParams(onCommand, commandName, PARAMS, values);
    } catch (error) {
      console.log(error);
    }

    return;
  });
};

start();

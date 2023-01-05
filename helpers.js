const getCommandName = (text, botTag, commandsInfo) => {
  if (text.includes(botTag)) {
    const noTagCommand = text.slice(1, text.indexOf(botTag));
    return noTagCommand;
  }
  const { common, admin, owner } = commandsInfo;
  const commands = [...common.keys(), ...admin.keys(), ...owner.keys()];
  for (const command of commands) {
    if (text.startsWith(command)) return command.replace("/", "");
  }
};

const getQueueName = (text, botTag, command) => {
  let queueName = text.replace(command, "");
  if (queueName.includes(botTag)) {
    queueName = queueName.replace(botTag, "");
  }
  queueName = queueName.trim();
  return queueName;
};

const getUpdatesType = (text, types) => {
  const existingTypes = types.filter((type) => text.includes(type));
  if (existingTypes.length === 0) return "Ви не вказали тип";
  if (existingTypes.length !== 1)
    return "Має бути 1 тип версії 'major', 'minor' або 'patch'";
  return existingTypes[0];
};

const getVersionDescription = (text, botTag, command) => {
  let description = text.replace(command, "");
  if (description.includes(botTag)) {
    description = description.replace(botTag, "");
  }
  description = description.trim();
  return description;
};

const generateNextVersionNumber = (previousNumber, versionTypes, type) => {
  if (!previousNumber) return "1.0.0";
  const typeNumber = versionTypes.indexOf(type);
  const previousNumbers = previousNumber.split(".");
  previousNumbers[typeNumber]++;
  for (let i = 0; i < previousNumbers.length; i++) {
    if (i > typeNumber) previousNumbers[i] = 0;
  }
  return previousNumbers.join(".");
};

const getDataOptions = (data) => data.split(":");

hasUserAccess = (userId, ...collections) => {
  for (const collection of collections) {
    if (collection.map((user) => user.id).includes(userId)) return true;
  }
  return false;
};

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
    if (!obj && !this.error) {
      this.error = errorMsg;
    }
    return this;
  },

  isFalse(obj, errorMsg) {
    if (obj && !this.error) {
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

const callFunctionWithArgs = (commandsFunctions, command, params, values) => {
  const commandParams = params.get(command);
  if (!commandParams) return;
  const valuesArray = commandParams.map((param) => values[param]);
  return commandsFunctions[command](...valuesArray);
};

const isBotLeftGroup = (msg, botId) => msg?.left_chat_member?.id === botId;

const isBotJoinedGroup = (msg, botId) => msg?.new_chat_member?.id === botId;

const commandsWithRequiredId = [
  "addAdmin",
  "removeAdmin",
  "addOwner",
  "removeOwner",
  "removeFromCustomers",
];
const getValuesFromMessage = (msg, botData) => {
  const chatId = msg.chat.id;
  const { botId, tag, commandsInfo } = botData;
  if (isBotJoinedGroup(msg, botId)) return ["botJoinedToChat", { chatId }];
  if (isBotLeftGroup(msg, botId)) return ["botLeftTheChat", { chatId }];

  if (msg.text && msg.text.startsWith("/")) {
    const text = msg.text;
    const commandName = getCommandName(text, tag, commandsInfo);
    const command = "/" + commandName;
    const queueName = getQueueName(text, tag, command);
    const versionDescription = getVersionDescription(text, tag, command);
    const userId = msg.from.id;
    const userTag = msg.from.username;
    const values = {
      queueName,
      chatId,
      userId,
      queuesLimit: 10,
      userTag,
      versionDescription,
    };

    if (commandName === "addMeToCustomers") {
      values.description = text.replace(command, "").trim();
    }

    if (commandsWithRequiredId.includes(commandName)) {
      values.customerId = text.replace(command, "").trim();
    }

    return [commandName, values];
  }
};

const getCommandsDescription = (commands) => {
  let result = "";
  for (const command of commands.entries()) {
    result += `${command.join(" ")}\n`;
  }
  return result;
};

module.exports = {
  getCommandName,
  getQueueName,
  getUpdatesType,
  getVersionDescription,
  generateNextVersionNumber,
  getDataOptions,
  checker,
  queueNameChecker,
  callFunctionWithArgs,
  isBotLeftGroup,
  isBotJoinedGroup,
  getValuesFromMessage,
  hasUserAccess,
  getCommandsDescription,
};

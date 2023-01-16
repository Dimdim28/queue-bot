'use strict';

const getCommandName = (text, botTag, commandsInfo) => {
  if (text.includes(botTag)) {
    const noTagCommand = text.slice(1, text.indexOf(botTag));
    return noTagCommand;
  }
  const { common, admin, owner } = commandsInfo;
  const commands = [...common.keys(), ...admin.keys(), ...owner.keys()];
  for (const command of commands) {
    if (text.startsWith(command)) return command.replace('/', '');
  }
};

const cutInputText = (text, botTag, command) => {
  let infoFromCommand = text.replace(command, '');
  if (infoFromCommand.includes(botTag)) {
    infoFromCommand = infoFromCommand.replace(botTag, '');
  }
  infoFromCommand = infoFromCommand.trim();
  return infoFromCommand;
};

const getUpdatesType = (text, types) => {
  const existingTypes = types.filter((type) => text.includes(type));
  if (existingTypes.length === 0) return 'Ви не вказали тип';
  if (existingTypes.length !== 1)
    return 'Має бути 1 тип версії \'major\', \'minor\' або \'patch\'';
  return existingTypes[0];
};

const generateNextVersionNumber = (previousNumber, versionTypes, type) => {
  if (!previousNumber) return '1.0.0';
  const typeNumber = versionTypes.indexOf(type);
  const previousNumbers = previousNumber.split('.');
  previousNumbers[typeNumber]++;
  for (let i = 0; i < previousNumbers.length; i++) {
    if (i > typeNumber) previousNumbers[i] = 0;
  }
  return previousNumbers.join('.');
};

const getDataOptions = (data) => data.split(':');

const hasUserAccess = (userId, ...collections) => {
  for (const collection of collections) {
    if (collection.map((user) => user.id).includes(userId)) return true;
  }
  return false;
};

const indexOfUser = (userId, collection) =>
  collection.map((user) => user.id).indexOf(Number(userId));

const checker = (collection) => {
  let errorMsg = undefined;
  for (const obj of collection) {
    if (!obj.check) {
      errorMsg = obj.msg;
      break;
    }
  }
  return errorMsg;
};

const queueNameChecker = (queueName) => {
  const chars = '{}[]/?|~!@#$^;:&*()+';
  if (!queueName) {
    return 'Ви не ввели назву черги!';
  }
  for (const char of chars) {
    if (queueName.includes(char)) {
      return `Символи ${chars} є недопустимими`;
    }
  }
};

const callFunctionWithArgs = (commandsFunctions, command, params, values) => {
  const commandParams = params.get(command);
  if (!commandParams) return;
  const valuesArray = commandParams.map((param) => values[param]);
  return commandsFunctions[command](...valuesArray);
};

const isBotLeftGroup = (msg, botId) => msg?.left_chat_member?.id === botId;

const isBotJoinedGroup = (msg, botId) => msg?.new_chat_member?.id === botId;

const getValuesFromMessage = (msg, botData) => {
  const chatId = msg.chat.id;
  const { botId, tag, commandsInfo } = botData;
  if (isBotJoinedGroup(msg, botId)) return ['botJoinedToChat', { chatId }];
  if (isBotLeftGroup(msg, botId)) return ['botLeftTheChat', { chatId }];

  if (msg.text && msg.text.startsWith('/')) {
    const text = msg.text;
    const commandName = getCommandName(text, tag, commandsInfo);
    const command = '/' + commandName;
    const { id, username } = msg.from;
    const message = cutInputText(text, tag, command);
    const values = {
      chatId,
      message,
      userId: id,
      queuesLimit: 10,
      userTag: username,
    };
    return [commandName, values];
  }
};

const getCommandsDescription = (commands) => {
  let result = '';
  for (const command of commands.entries()) {
    result += `${command.join(' ')}\n`;
  }
  return result;
};

const validateVersionNumber = (message) => {
  const lines = message.split('.');
  for (const line of lines) {
    if (String(Number(line)) !== line) return false;
  }
  return true;
};

const isIdValid = (id) => String(Number(id)) === id;

const formattedUserInfo = (id, tag, description) => (
  `<b>id</b> - <i>${id}</i>\n` +
  `<b>tag</b> - <i>@${tag}</i>\n` +
  `<b>description</b> - <i>${description}</i>\n\n`);

module.exports = {
  getCommandName,
  getUpdatesType,
  generateNextVersionNumber,
  getDataOptions,
  checker,
  queueNameChecker,
  callFunctionWithArgs,
  isBotLeftGroup,
  isBotJoinedGroup,
  getValuesFromMessage,
  hasUserAccess,
  indexOfUser,
  getCommandsDescription,
  validateVersionNumber,
  isIdValid,
  cutInputText,
  formattedUserInfo,
};

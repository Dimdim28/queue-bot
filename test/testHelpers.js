const { botData } = require("../botData");
const { getCommandName } = require("../helpers");
const { botTag, commandsInfo } = botData;
const { redC, greenC } = require("./helpers");

function testGetCommandName() {
  const checkCommand = (text, name) => {
    const result = getCommandName(text, botTag, commandsInfo);
    const resultMessage = name
      ? `parsed command name: ${result}`
      : `any command in the start of line, undefined`;
    if (result === name)
      greenC(`entered text: ${text}, result: ${resultMessage}`);
    else {
      redC(`entered text: ${text}, result: ${result}, but expected: ${name}`);
    }
  };

  const testArray = [
    ["/idjfnodfndi", undefined],
    ["/helpdpmodif-", "help"],
    ["/addAdmin 67768 gfgf", "addAdmin"],
    ["/viewCustomers@queue_im_bot ghhgh", "viewCustomers"],
    ["/newVersion new patch update patch", "newVersion"],
    ["/@queue_im_botfind fghg", undefined],
    ["/newQueue testqueuename", "newQueue"],
  ];

  console.group("checking getCommandName function");
  for (const test of testArray) {
    checkCommand(...test);
  }
  console.groupEnd();
}

async function testHelpers() {
  console.group("checking for helpers functions");
  await testGetCommandName();
}

module.exports = { testHelpers };

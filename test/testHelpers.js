const { botData } = require("../botData");
const { getCommandName, cutInputText } = require("../helpers");
const { tag, commandsInfo } = botData;
const { redC, greenC } = require("./helpers");

const checkCommand = (input, expectedResult, command, ...args) => {
  const result = command(input, ...args);
  const resultMessage = expectedResult ? result : expectedResult;
  if (result === expectedResult)
    greenC(`entered data: "${input}", result: "${resultMessage}"`);
  else {
    redC(
      `entered data: "${input}", result: "${result}", but expected: "${expectedResult}"`
    );
  }
};

function testGetCommandName() {
  const testArray = [
    ["/helpdim-", "help"],
    ["/addAdmin 67768 gfgf", "addAdmin"],
    ["/viewCustomers@queue_im_bot ghhgh", "viewCustomers"],
    ["/newVersion new patch update patch", "newVersion"],
    ["/@queue_im_botfind fghg", ""],
    ["/newQueue testqueuename", "newQueue"],
  ];

  console.group("checking getCommandName function");
  for (const test of testArray) {
    checkCommand(...test, getCommandName, tag, commandsInfo);
  }
  console.groupEnd();
}

function testCutInputText() {
  console.group("checking cutInputText function");
  const testArray = [
    ["/find lcbh", "/find", "lcbh"],
    ["/addAdmin 67768 gfgf", "/addAdmin", "67768 gfgf"],
    ["/getVersionInfo@queue_im_bot 3.4.2", "/getVersionInfo", "3.4.2"],
    [
      "/newVersion new patch update patch",
      "/newVersion",
      "new patch update patch",
    ],
    ["/removeMeFromCustomers", "/removeMeFromCustomers", ""],
  ];

  for (const test of testArray) {
    const [input, command, result] = test;
    checkCommand(input, result, cutInputText, tag, command);
  }
  console.groupEnd();
}

console.log(cutInputText("/hello slaves", "@queue_im_bot", "/hello"));
function testHelpers() {
  console.group("checking for helpers functions");
  testGetCommandName();
  testCutInputText();
}

module.exports = { testHelpers };

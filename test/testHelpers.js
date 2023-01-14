const { botData } = require("../botData");
const { getCommandName, cutInputText, getUpdatesType } = require("../helpers");
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
  console.log("\n");
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
  console.log("\n");
  console.groupEnd();
}

function testGetUpdatesType() {
  console.group("checking getUpdatesType function");
  const types = ["major", "minor", "patch"];
  const testArray = [
    ["new version patch", "patch"],
    ["version new feathure minor", "minor"],
    ["changed structure major", "major"],
    [
      "version major minor patch",
      "Має бути 1 тип версії 'major', 'minor' або 'patch'",
    ],
  ];

  for (const test of testArray) {
    const [text, type] = test;
    checkCommand(text, type, getUpdatesType, types);
  }
  console.log("\n");
  console.groupEnd();
}

function testHelpers() {
  console.group("checking for helpers functions");
  testGetCommandName();
  testCutInputText();
  testGetUpdatesType();
}

module.exports = { testHelpers };

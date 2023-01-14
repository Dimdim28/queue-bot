const { botData } = require("../botData");
const {
  getCommandName,
  cutInputText,
  getUpdatesType,
  generateNextVersionNumber,
  queueNameChecker,
  getCommandsDescription,
  validateVersionNumber,
  isIdValid,
  hasUserAccess,
  indexOfUser,
} = require("../helpers");
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

function testGenerateNextVersionNumber() {
  console.group("checking getUpdatesType function");
  const types = ["major", "minor", "patch"];
  const testArray = [
    ["", "", "1.0.0"],
    ["1.3.2", "minor", "1.4.0"],
    ["2.5.4", "major", "3.0.0"],
    ["1.5.7", "patch", "1.5.8"],
  ];

  for (const test of testArray) {
    const [number, type, result] = test;
    checkCommand(number, result, generateNextVersionNumber, types, type);
  }
  console.log("\n");
  console.groupEnd();
}

function testQueueNameChecker() {
  console.group("checking getUpdatesType function");
  const errorMessage =
    "Символи { } [ ] / ? . > <  |  ~ ! @ # $ ^ ; : & * () + - недопустимі ";
  const testArray = [
    ["", "Ви не ввели назву черги!"],
    ["newQueueTest", undefined],
    ["queue*", errorMessage],
    ["hello()", errorMessage],
    ["<script>console.log('hacked')</script>", errorMessage],
    ["/d{8}/", errorMessage],
  ];

  for (const test of testArray) {
    const [name, result] = test;
    checkCommand(name, result, queueNameChecker, name);
  }
  console.log("\n");
  console.groupEnd();
}

function testGetCommandsDescription() {
  console.group("checking getCommandsDescription function");
  const initialArray = [
    ["/first", "firstDescr"],
    ["/second", "second Description"],
  ];
  const initialCollection = new Map(initialArray);
  const expectedDescription = "/first firstDescr\n/second second Description\n";
  const resultDescription = getCommandsDescription(initialCollection);
  if (expectedDescription === resultDescription) greenC(`all is ok"`);
  else {
    redC(
      `result: "${resultDescription}", but expected: "${expectedDescription}"`
    );
  }
  console.log("\n");
  console.groupEnd();
}

function testValidateVersionNumber() {
  console.group("checking validateVersionNumber function");
  const testArray = [
    ["", false],
    ["2.dfg.fdg.gf", false],
    ["5.6.8", true],
    ["6.8*", false],
    ["po.dgp.f[", false],
    ["2.2.8", true],
  ];

  for (const test of testArray) {
    const [version, result] = test;
    checkCommand(version, result, validateVersionNumber, version);
  }
  console.log("\n");
  console.groupEnd();
}

function testIsIdValid() {
  console.group("checking isIdValid function");
  const testArray = [
    ["", false],
    ["2.fdg.gf", false],
    ["587", true],
    ["6*", false],
    ["null", false],
    ["{opfds8", false],
  ];

  for (const test of testArray) {
    const [number, result] = test;
    checkCommand(number, result, isIdValid, number);
  }
  console.log("\n");
  console.groupEnd();
}

function testHasUserAccess() {
  const adminsCollection = [{ id: "1" }, { id: "2" }];
  const developersCollection = [{ id: "3" }, { id: "4" }];

  console.group("checking hasUserAccess function");
  const testArray = [
    ["1", true],
    ["4", true],
    ["10", false],
    ["pofdn*", false],
    ["70", false],
  ];

  for (const test of testArray) {
    const [number, result] = test;
    checkCommand(
      number,
      result,
      hasUserAccess,
      adminsCollection,
      developersCollection
    );
  }
  console.log("\n");
  console.groupEnd();
}

function testIndexOfUser() {
  const idsCollection = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
  console.group("checking indexOfUser function");
  const testArray = [
    ["1", 0],
    ["4", 3],
    ["10", -1],
    ["pofdn*", -1],
    ["70", -1],
  ];

  for (const test of testArray) {
    const [number, result] = test;
    checkCommand(number, result, indexOfUser, idsCollection);
  }
  console.log("\n");
  console.groupEnd();
}

function testHelpers() {
  console.group("checking for helpers functions");
  testGetCommandName();
  testCutInputText();
  testGetUpdatesType();
  testGenerateNextVersionNumber();
  testHasUserAccess();
  testIndexOfUser();
  testQueueNameChecker();
  testGetCommandsDescription();
  testValidateVersionNumber();
  testIsIdValid();
  console.groupEnd();
}

module.exports = { testHelpers };

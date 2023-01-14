require("dotenv").config();
const { connectMongoClient } = require("./mongo");
const { testAdminsCollection } = require("./test/testAdmins");
const { testChatsCollection } = require("./test/testChats");
const { testHelpers } = require("./test/testHelpers");
const { testQueuesCollection } = require("./test/testQueues");
const { testVersionsCollection } = require("./test/testVersions");

connectMongoClient();

async function collectionTests() {
  await testAdminsCollection();
  await testChatsCollection();
  await testVersionsCollection();
  await testQueuesCollection();
}

async function allTests() {
  testHelpers();
  //await collectionTests();
  process.exit(0);
}

allTests();

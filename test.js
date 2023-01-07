require("dotenv").config();
const { connectMongoClient } = require("./mongo");
const { testAdminsCollection } = require("./test/testAdmins");
const { testChatsCollection } = require("./test/testChats");
const { testVersionsCollection } = require("./test/testVersions");

connectMongoClient();
async function collectionTests() {
  await testAdminsCollection();
  console.log("\n\n");
  await testChatsCollection();
  console.log("\n\n");
  await testVersionsCollection();
}

collectionTests();

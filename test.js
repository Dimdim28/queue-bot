require("dotenv").config();
const { connectMongoClient } = require("./mongo");
const { testAdminsCollection } = require("./test/testAdmins");
const { testChatsCollection } = require("./test/testChats");

connectMongoClient();
async function collectionTests() {
  await testAdminsCollection();
  console.log("\n\n");
  await testChatsCollection();
}

collectionTests();

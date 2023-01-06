require("dotenv").config();
const { connectMongoClient } = require("./mongo");
const { testAdminsCollection } = require("./test/testAdmins");

connectMongoClient();

testAdminsCollection();

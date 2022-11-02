const { MongoClient } = require("mongodb");
require("dotenv").config();

const url = process.env.dbToken;
const client = new MongoClient(url);
const dbName = "queueBotBase"; // Database Name
const db = client.db(dbName);
function connectMongoClient() {
  client.connect();
}
class collection {
  constructor(name) {
    this.collection = db.collection(name);
  }

  findQueue(queueName) {
    return this.collection.findOne({
      name: queueName,
    });
  }

  findQueueWithUser(queueName, userId) {
    return this.collection.findOne({
      name: queueName,
      people: { $elemMatch: { id: userId } },
    });
  }

  findQueueWithOwner(queueName, userId) {
    return this.collection.findOne({
      name: queueName,
      creatorId: userId,
    });
  }

  deleteQueue(queueName) {
    return this.collection.deleteOne({
      name: queueName,
    });
  }

  createQueue(queueName, userId) {
    return this.collection.insertOne({
      name: queueName,
      people: [],
      creatorId: userId,
    });
  }

  addToQueue(queueName, userId, userTag) {
    return this.collection.updateOne(
      { name: queueName },
      { $push: { people: { id: userId, tag: userTag } } }
    );
  }

  removeFromQueue(queueName, userId) {
    return this.collection.updateOne(
      { name: queueName },
      { $pull: { people: { id: userId } } }
    );
  }

  getCursor(properties, limit) {
    return this.collection.find(properties).limit(limit);
  }

  async checkAndCreateQueue(queueName, userId) {
    let msg;
    const queue = await this.findQueue(queueName);
    if (queue) {
      msg = `Черга з назвою ${queueName} вже існує!`;
    } else {
      await this.createQueue(queueName, userId);
      msg = `Чергу ${queueName} створено`;
    }
    return msg;
  }

  async checkAndLookQueue(queueName) {
    let msg, areButtonsNeeded;
    const queue = await this.findQueue(queueName);
    if (!queue) {
      msg = `Черги ${queueName} не існує!`;
      areButtonsNeeded = false;
    } else {
      msg = `Черга ${queueName}:`;
      areButtonsNeeded = true;
    }
    return { msg, areButtonsNeeded };
  }
}

module.exports = { collection, connectMongoClient };

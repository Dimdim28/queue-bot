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
  #collection;
  constructor(name) {
    this.#collection = db.collection(name);
  }

  find(params = {}) {
    return this.#collection.findOne(params);
  }

  create(obj) {
    return this.#collection.insertOne(obj);
  }

  delete(obj) {
    return this.#collection.deleteOne(obj);
  }

  update(filter, update) {
    return this.#collection.updateOne(filter, update);
  }
  getCursor(properties, limit) {
    return this.#collection.find(properties).limit(limit);
  }
}

class queues extends collection {
  constructor(...args) {
    super(...args);
  }
  findQueue(queueName) {
    return this.find({
      name: queueName,
    });
  }

  findQueueWithUser(queueName, userId) {
    return this.find({
      name: queueName,
      people: { $elemMatch: { id: userId } },
    });
  }

  findQueueWithOwner(queueName, userId) {
    return this.find({
      name: queueName,
      creatorId: userId,
    });
  }

  deleteQueue(queueName) {
    return this.delete({
      name: queueName,
    });
  }

  createQueue(queueName, userId) {
    return this.create({
      name: queueName,
      people: [],
      creatorId: userId,
    });
  }

  addToQueue(queueName, userId, userTag) {
    return this.update(
      { name: queueName },
      { $push: { people: { id: userId, tag: userTag } } }
    );
  }

  removeFromQueue(queueName, userId) {
    return this.update(
      { name: queueName },
      { $pull: { people: { id: userId } } }
    );
  }

  // async checkAndCreateQueue(queueName, userId) {
  //   let msg;
  //   const queue = await this.findQueue(queueName);
  //   if (queue) {
  //     msg = `Черга з назвою ${queueName} вже існує!`;
  //   } else {
  //     await this.createQueue(queueName, userId);
  //     msg = `Чергу ${queueName} створено`;
  //   }
  //   return msg;
  // }

  // async checkAndLookQueue(queueName) {
  //   let msg, areButtonsNeeded;
  //   const queue = await this.findQueue(queueName);
  //   if (!queue) {
  //     msg = `Черги ${queueName} не існує!`;
  //     areButtonsNeeded = false;
  //   } else {
  //     msg = `Черга ${queueName}:`;
  //     areButtonsNeeded = true;
  //   }
  //   return { msg, areButtonsNeeded };
  // }
}

class versions extends collection {
  constructor(...args) {
    super(...args);
  }

  getLastVersion() {
    return this.find({
      isTheLast: true,
    });
  }

  updateVersionInfo(version, values) {
    return this.update({ version }, { $set: values });
  }

  async newVersion(version, date, description) {
    const previous = await this.getLastVersion();
    console.log("previous", previous);
    if (previous) {
      const version = previous.version;
      await this.updateVersionInfo(version, { isTheLast: false });
    }
    return this.create({ isTheLast: true, version, date, description });
  }

  getPreviousVersions(count = 10) {
    return this.getCursor({ isTheLast: false }, count);
  }
}

module.exports = { queues, versions, connectMongoClient };

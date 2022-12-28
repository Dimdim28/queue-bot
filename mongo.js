const { MongoClient } = require("mongodb");
require("dotenv").config();

const url = process.env.dbToken;
const client = new MongoClient(url);
const dbName = "queueBotBase"; // Database Name
const db = client.db(dbName);
function connectMongoClient() {
  client.connect();
}
class Collection {
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
  getCursor(properties) {
    return this.#collection.find(properties);
  }
}

class Queues extends Collection {
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
}

class Versions extends Collection {
  getLastVersion() {
    return this.find({
      isTheLast: true,
    });
  }

  getVersion(number) {
    return this.find({
      version: number,
    });
  }

  updateVersionInfo(version, values) {
    return this.update({ version }, { $set: values });
  }

  async newVersion(version, date, description) {
    const previous = await this.getLastVersion();
    if (previous) {
      const version = previous.version;
      await this.updateVersionInfo(version, { isTheLast: false });
    }
    return this.create({ isTheLast: true, version, date, description });
  }

  getPreviousVersions() {
    return this.getCursor({ isTheLast: false });
  }
}

class Chats extends Collection {
  getChatIds() {
    return this.find({ name: "chatsCollection" });
  }

  createChatsCollection() {
    return this.create({
      name: "chatsCollection",
      chats: [],
    });
  }

  addChat(chatId) {
    return this.update(
      { name: "chatsCollection" },
      { $push: { chats: { id: chatId } } }
    );
  }

  removeChat(chatId) {
    return this.update(
      { name: "chatsCollection" },
      { $pull: { chats: { id: chatId } } }
    );
  }
}

class Admins extends Collection {
  createAdminsCollection() {
    return this.create({
      name: "adminsCollection",
      admins: [],
      newCustomers: [],
      owners: [1098896359, 374131845],
    });
  }

  addAdmin(id, tag, description) {
    return this.update(
      { name: "adminsCollection" },
      { $push: { admins: { id, tag, description } } }
    );
  }

  addOwner(id, tag, description) {
    return this.update(
      { name: "adminsCollection" },
      { $push: { owners: { id, tag, description } } }
    );
  }

  removeAdmin(id) {
    return this.update(
      { name: "adminsCollection" },
      { $pull: { admins: { id } } }
    );
  }

  removeOwner(id) {
    return this.update(
      { name: "adminsCollection" },
      { $pull: { owners: { id } } }
    );
  }

  addNewCustomer(id, tag, description) {
    return this.update(
      { name: "adminsCollection" },
      { $push: { newCustomers: { id, tag, description } } }
    );
  }

  removeCustomer(id) {
    return this.update(
      { name: "adminsCollection" },
      { $pull: { newCustomers: { id } } }
    );
  }

  getAdminsIds() {
    return this.find({ name: "adminsCollection" });
  }
}

module.exports = { Queues, Versions, Chats, connectMongoClient, Admins };

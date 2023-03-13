"use strict";

const {
  getUpdatesType,
  generateNextVersionNumber,
  checker,
  queueNameChecker,
  hasUserAccess,
  indexOfUser,
  getCommandsDescription,
  validateVersionNumber,
  isIdValid,
  formattedUserInfo,
} = require("./helpers");

const { addMeToQueueOptions, LookMyQueuesOptions } = require("./options");
const { errorMsg } = require("./answers");

class Executor {
  #bot;
  #necessaryValues;

  constructor(bot, values) {
    this.#bot = bot;
    this.#necessaryValues = values;
  }

  async start(chatId) {
    return this.#bot.sendMessage(chatId, "Вас вітає queue_bot =)");
  }

  updateNecessaryValues(newValues) {
    this.#necessaryValues = Object.assign(this.#necessaryValues, newValues);
  }

  async help(chatId, userId) {
    const { creatorsIds, botData } = this.#necessaryValues;
    const { common, admin, owner } = botData.commandsInfo;
    const { owners, admins } = creatorsIds;
    let result = getCommandsDescription(common);
    if (hasUserAccess(userId, admins)) {
      result += `\n\n\n${getCommandsDescription(admin)}`;
    }
    if (hasUserAccess(userId, owners)) {
      result += `\n\n\n${getCommandsDescription(admin)}`;
      result += `\n\n\n${getCommandsDescription(owner)}`;
    }
    return this.#bot.sendMessage(chatId, `список команд:\n\n${result}`);
  }

  async info(chatId) {
    const lastVersion =
      (await this.#necessaryValues.versionCollection.getLastVersion()) || {
        version: "1.0.0",
      };

    return this.#bot.sendMessage(
      chatId,
      "Це бот, розроблений D_im0N и Nailggy для створення черг" +
        ` і роботи з ними \nПоточна версія боту - ${lastVersion.version}`
    );
  }

  async viewmyqueues(chatId) {
    const options = LookMyQueuesOptions();
    return this.#bot.sendMessage(chatId, "Які черги цікавлять?", options);
  }

  async new(queueName, chatId, userId) {
    const queueNameError = queueNameChecker(queueName);
    if (queueNameError) return this.#bot.sendMessage(chatId, queueNameError);

    const queue = await this.#necessaryValues.queuesCollection.findQueue(
      queueName
    );
    const addToQueueOptions = addMeToQueueOptions(queueName);

    const error = checker([
      {
        check: !queue,
        msg: errorMsg.queueExists(queueName),
      },
    ]);
    if (error) {
      return this.#bot.sendMessage(chatId, error, addToQueueOptions);
    }

    await this.#necessaryValues.queuesCollection.createQueue(queueName, userId);
    return this.#bot.sendMessage(
      chatId,
      `Чергу ${queueName} створено`,
      addToQueueOptions
    );
  }

  async look(queueName, chatId) {
    const queueNameError = queueNameChecker(queueName);
    if (queueNameError) return this.#bot.sendMessage(chatId, queueNameError);

    const queue = await this.#necessaryValues.queuesCollection.findQueue(
      queueName
    );
    const addToQueueOptions = addMeToQueueOptions(queueName);

    const error = checker([
      {
        check: queue,
        msg: errorMsg.queueDoesNotExist(queueName),
      },
    ]);
    if (error) {
      return this.#bot.sendMessage(chatId, error);
    }

    return this.#bot.sendMessage(
      chatId,
      `Черга ${queueName}:`,
      addToQueueOptions
    );
  }

  async find(queueName, chatId, queuesLimit) {
    const queueNameError = queueNameChecker(queueName);
    if (queueNameError) return this.#bot.sendMessage(chatId, queueNameError);

    const expr = new RegExp(queueName, "i");
    const myQueues = [];
    const cursor = await this.#necessaryValues.queuesCollection
      .getCursor({ name: { $regex: expr } })
      .limit(queuesLimit);
    await cursor.forEach((obj) => {
      myQueues.push(obj["name"]);
    });

    const error = checker([
      {
        check: myQueues.length,
        msg: errorMsg.nothingFound,
      },
    ]);
    if (error) {
      return this.#bot.sendMessage(chatId, error);
    }

    return this.#bot.sendMessage(
      chatId,
      `Знайдені черги: \n\n${myQueues.join("\n")}\n\n*Макс. ${queuesLimit}*`
    );
  }

  async delete(queueName, chatId, userId, userTag) {
    const { admins, owners } = this.#necessaryValues.creatorsIds;
    const hasAccess = hasUserAccess(userId, admins, owners);
    const queueNameError = queueNameChecker(queueName);
    if (queueNameError) return this.#bot.sendMessage(chatId, queueNameError);

    const queue = await this.#necessaryValues.queuesCollection.findQueue(
      queueName
    );
    const queueWithOwner =
      await this.#necessaryValues.queuesCollection.findQueueWithOwner(
        queueName,
        userId
      );

    const error = checker([
      {
        check: queue,
        msg: errorMsg.queueDoesNotExist(queueName),
      },
      {
        check: queueWithOwner || hasAccess,
        msg: errorMsg.notACreator(userTag),
      },
    ]);
    if (error) {
      return this.#bot.sendMessage(chatId, error);
    }

    await this.#necessaryValues.queuesCollection.deleteQueue(queueName);
    return this.#bot.sendMessage(
      chatId,
      `@${userTag}, чергу ${queueName} успішно видалено`
    );
  }

  async addMeToQueue(queueName, chatId, userId, userTag) {
    const queue = await this.#necessaryValues.queuesCollection.findQueue(
      queueName
    );
    const userInQueue =
      await this.#necessaryValues.queuesCollection.findQueueWithUser(
        queueName,
        userId
      );

    const error = checker([
      {
        check: queue,
        msg: errorMsg.queueDoesNotExist(queueName),
      },
      {
        check: !userInQueue,
        msg: errorMsg.alreadyInQueue(userTag, queueName),
      },
    ]);
    if (error) {
      return this.#bot.sendMessage(chatId, error);
    }

    await this.#necessaryValues.queuesCollection.addToQueue(
      queueName,
      userId,
      userTag
    );
    return this.#bot.sendMessage(
      chatId,
      `@${userTag} записався(-ась) у чергу ${queueName} `
    );
  }

  async viewQueue(queueName, chatId) {
    const queue = await this.#necessaryValues.queuesCollection.findQueue(
      queueName
    );
    const people = queue?.people;

    const error = checker([
      {
        check: queue,
        msg: errorMsg.queueDoesNotExist(queueName),
      },
      {
        check: people?.length,
        msg: errorMsg.queueIsEmpty(queueName),
      },
    ]);
    if (error) {
      return this.#bot.sendMessage(chatId, error);
    }

    return this.#bot.sendMessage(
      chatId,
      `Назва черги: ${queueName}\n\n${people
        .map((member, index) => `${++index}: ${member.tag}`)
        .join("\n")}`
    );
  }

  async tagNext(queueName, chatId, userId, userTag) {
    const { admins, owners } = this.#necessaryValues.creatorsIds;
    const hasAccess = hasUserAccess(userId, admins, owners);
    const queue = await this.#necessaryValues.queuesCollection.findQueue(
      queueName
    );
    const people = queue?.people;
    const firstInQueueId = people && people[0]?.id;
    const isFirstOrCreator = [firstInQueueId, queue?.creatorId].includes(
      userId
    );

    const error = checker([
      {
        check: queue,
        msg: errorMsg.queueDoesNotExist(queueName),
      },
      {
        check: people?.length,
        msg: errorMsg.queueIsEmpty(queueName),
      },
      {
        check: isFirstOrCreator || hasAccess,
        msg: errorMsg.notFirstOrCreator(userTag),
      },
    ]);
    if (error) {
      return this.#bot.sendMessage(chatId, error);
    }

    const firstMember = people[0];
    const firstTag = firstMember.tag; // first will be for sure
    const nextMember = people[1];
    const nextTag = nextMember?.tag; // next may be undefined

    if (!nextMember) {
      await this.#necessaryValues.queuesCollection.deleteQueue(queueName);
      return this.#bot.sendMessage(
        chatId,
        `${firstTag} останнім покинув(-ла) чергу ${queueName}, тому її видалено`
      );
    }

    await this.#necessaryValues.queuesCollection.removeFromQueue(
      queueName,
      firstInQueueId
    );
    return this.#bot.sendMessage(
      chatId,
      `${"@" + firstTag} покинув(-ла) чергу ${queueName}\n` +
        `Наступний(-а) у черзі: @${nextTag}`
    );
  }

  async removeMeFromQueue(queueName, chatId, userId, userTag) {
    const queue = await this.#necessaryValues.queuesCollection.findQueue(
      queueName
    );
    const queueWithUser =
      await this.#necessaryValues.queuesCollection.findQueueWithUser(
        queueName,
        userId
      );

    const error = checker([
      {
        check: queue,
        msg: errorMsg.queueDoesNotExist(queueName),
      },
      {
        check: queueWithUser,
        msg: errorMsg.notInQueue(userTag, queueName),
      },
    ]);
    if (error) {
      return this.#bot.sendMessage(chatId, error);
    }

    const numOfPeople = queueWithUser.people.length;
    if (numOfPeople === 1) {
      await this.#necessaryValues.queuesCollection.deleteQueue(queueName);
      return this.#bot.sendMessage(
        chatId,
        `${userTag} останнім покинув(-ла) чергу ${queueName}, тому її видалено`
      );
    }

    await this.#necessaryValues.queuesCollection.removeFromQueue(
      queueName,
      userId
    );
    return this.#bot.sendMessage(
      chatId,
      `@${userTag} виписався(-ась) з черги ${queueName}`
    );
  }

  async lookMyQueues(chatId, userId, userTag, queuesLimit) {
    const cursor = await this.#necessaryValues.queuesCollection
      .getCursor({ people: { $elemMatch: { id: userId } } })
      .limit(queuesLimit);
    const myQueues = [];
    await cursor.forEach((obj) => {
      myQueues.push(obj["name"]);
    });

    const error = checker([
      {
        check: myQueues.length,
        msg: errorMsg.noJoinedQueues(userTag),
      },
    ]);
    if (error) {
      return this.#bot.sendMessage(chatId, error);
    }

    return this.#bot.sendMessage(
      chatId,
      `Черги, де записаний(-а) @${userTag}: \n\n${myQueues.join(
        "\n"
      )}\n\n*Макс. ${queuesLimit}*`
    );
  }

  async lookMyOwnQueues(chatId, userId, userTag, queuesLimit) {
    const cursor = await this.#necessaryValues.queuesCollection
      .getCursor({ creatorId: userId })
      .limit(queuesLimit);
    const myQueues = [];
    await cursor.forEach((obj) => {
      myQueues.push(obj["name"]);
    });

    const error = checker([
      {
        check: myQueues.length,
        msg: errorMsg.noCreatedQueues(userTag),
      },
    ]);
    if (error) {
      return this.#bot.sendMessage(chatId, error);
    }

    return this.#bot.sendMessage(
      chatId,
      `Створені @${userTag} черги: \n\n${myQueues.join(
        "\n"
      )}\n\n*Макс. ${queuesLimit}*`
    );
  }

  async createVersion(chatId, userId, description) {
    const { admins, owners } = this.#necessaryValues.creatorsIds;
    const hasAccess = hasUserAccess(userId, owners, admins);

    const error = checker([
      {
        check: hasAccess,
        msg: errorMsg.noAccess,
      },
    ]);
    if (error) {
      return this.#bot.sendMessage(chatId, error);
    }

    const lastVersion =
      await this.#necessaryValues.versionCollection.getLastVersion();
    const versionNumber = lastVersion?.version;
    let newVersion;
    const updatesType = getUpdatesType(
      description,
      this.#necessaryValues.versionTypes
    );
    if (!this.#necessaryValues.versionTypes.includes(updatesType))
      return this.#bot.sendMessage(chatId, updatesType);
    newVersion = generateNextVersionNumber(
      versionNumber,
      this.#necessaryValues.versionTypes,
      updatesType
    );

    const date = new Date();
    const descrWithoutType = description.replace(updatesType, "").trim();
    await this.#necessaryValues.versionCollection.newVersion(
      newVersion,
      date,
      descrWithoutType
    );
    return this.#bot.sendMessage(chatId, "успішно створено");
  }

  async updateVersionDescription(chatId, userId, description) {
    const { admins, owners } = this.#necessaryValues.creatorsIds;
    const hasAccess = hasUserAccess(userId, admins, owners);
    const versionIndex = description.trim().lastIndexOf(" ");
    const isVersionSpecified = versionIndex >= 0;
    const descrWithoutNumber = description.slice(0, versionIndex).trim();
    const number = description.slice(versionIndex).trim();
    const isNumberValid = validateVersionNumber(number);
    const foundObject =
      await this.#necessaryValues.versionCollection.getVersion(number);

    const error = checker([
      {
        check: hasAccess,
        msg: errorMsg.noAccess,
      },
      {
        check: isVersionSpecified,
        msg: errorMsg.noVersion,
      },
      {
        check: descrWithoutNumber,
        msg: errorMsg.noDescription,
      },
      {
        check: isNumberValid,
        msg: errorMsg.incorrectVersionNumber,
      },
      {
        check: foundObject,
        msg: errorMsg.noVersionFound,
      },
    ]);
    if (error) {
      return this.#bot.sendMessage(chatId, error);
    }

    await this.#necessaryValues.versionCollection.updateVersionInfo(number, {
      description: descrWithoutNumber,
    });
    return this.#bot.sendMessage(chatId, "Успішно змінено");
  }

  async getVersionInfo(chatId, version) {
    const versionNum = validateVersionNumber(version);
    const foundObject =
      await this.#necessaryValues.versionCollection.getVersion(version);

    const error = checker([
      {
        check: versionNum,
        msg: errorMsg.noVersion,
      },
      {
        check: foundObject,
        msg: errorMsg.noVersionFound,
      },
    ]);
    if (error) {
      return this.#bot.sendMessage(chatId, error);
    }

    return this.#bot.sendMessage(
      chatId,
      `Версія ${version}:\nЧас створення:${foundObject.date.toString()}\n` +
        `Інформація про версію:${foundObject.description}`
    );
  }

  async getPreviousVersions(chatId, count) {
    let result = "",
      resultLength = 0,
      resultCount = 0;
    const limit = 3000;
    const number = Number(count.replace(/\D/, ""));
    const temp = number || 10;
    const versionCollection = this.#necessaryValues.versionCollection;
    const cursor = await versionCollection
      .getPreviousVersions()
      .sort({ _id: -1 });
    const versions = [];
    await cursor.forEach((obj) => {
      const { version, date, description } = obj;
      if (temp > versions.length) versions.push({ version, date, description });
    });

    const infoAboutVersion = (obj) =>
      `Версія ${obj.version}:\n` +
      `Час створення: ${obj.date.toString()}\n` +
      `Інформація про версію: ${obj.description}`;

    for (const obj of versions) {
      const versionLine = `${infoAboutVersion(obj)}\n`;
      const versionLinelength = versionLine.length;
      result += versionLine;
      resultLength += versionLinelength;
      resultCount++;
      if (resultLength >= limit) break;
    }

    const error = checker([
      {
        check: versions.length,
        msg: errorMsg.onlyOneVersionExists,
      },
      {
        check: resultLength < limit,
        msg: errorMsg.msgTooLong(resultLength, --resultCount),
      },
    ]);
    if (error) {
      return this.#bot.sendMessage(chatId, error);
    }

    return this.#bot.sendMessage(chatId, result);
  }

  async sendInfoAboutVersion(chatId) {
    const { admins, owners } = this.#necessaryValues.creatorsIds;
    const hasAccess = hasUserAccess(chatId, admins, owners);

    const error = checker([
      {
        check: hasAccess,
        msg: errorMsg.notInOwnerChat,
      },
    ]);
    if (error) {
      return this.#bot.sendMessage(chatId, error);
    }

    const lastVersion =
      (await this.#necessaryValues.versionCollection.getLastVersion()) || {
        version: "1.0.0",
        date: "це секрет)",
        description: "Перша версія боту, він вміє створювати черги",
      };

    for (const chatId of this.#necessaryValues.chatIds) {
      try {
        const text =
          "Бот знову активний!\n\n" +
          `Поточна версія боту ${lastVersion.version}\n\n` +
          `Дата створення ${lastVersion.date}\n\n` +
          `Основні зміни:\n\n${lastVersion.description}`;

        this.#bot.sendMessage(chatId, text);
      } catch (error) {
        console.log(error);
      }
    }
  }

  sendInfoAboutDeveloping(chatId) {
    const { admins, owners } = this.#necessaryValues.creatorsIds;
    const hasAccess = hasUserAccess(chatId, admins, owners);

    const error = checker([
      {
        check: hasAccess,
        msg: errorMsg.notInOwnerChat,
      },
    ]);
    if (error) {
      return this.#bot.sendMessage(chatId, error);
    }

    for (const chatId of this.#necessaryValues.chatIds) {
      try {
        this.#bot.sendMessage(chatId, "Почалися технічні роботи");
      } catch (error) {
        console.log(error);
      }
    }
  }

  async botLeftTheChat(chatId) {
    if (chatId < 0) {
      await this.#necessaryValues.chatsCollection.removeChat(chatId);
      const chatIds = this.#necessaryValues.chatIds.filter(
        (id) => id !== chatId
      );
      this.updateNecessaryValues({ chatIds });
    }
  }

  async botJoinedToChat(chatId) {
    if (chatId < 0) {
      await this.#necessaryValues.chatsCollection.addChat(chatId);
      const chatIds = [...this.#necessaryValues.chatIds, chatId];
      this.updateNecessaryValues({ chatIds });
    }
  }

  async addMeToCustomers(chatId, userId, userTag, description) {
    const { newCustomers, owners, admins } = this.#necessaryValues.creatorsIds;
    const isOwner = hasUserAccess(userId, owners);
    const isAdmin = hasUserAccess(userId, admins);
    const isCustomer = hasUserAccess(userId, newCustomers);
    const error = checker([
      {
        check: description,
        msg: errorMsg.noDescription,
      },
      {
        check: !isOwner,
        msg: errorMsg.alreadyOwner(userId),
      },
      {
        check: !isAdmin,
        msg: errorMsg.alreadyAdmin(userId),
      },
      {
        check: !isCustomer,
        msg: errorMsg.alreadyCustomer(userId),
      },
    ]);
    if (error) {
      return this.#bot.sendMessage(chatId, error);
    }

    try {
      await this.#necessaryValues.adminsCollection.addNewCustomer(
        userId,
        userTag,
        description
      );

      newCustomers.push({ id: userId, tag: userTag, description });
      return this.#bot.sendMessage(chatId, `@${userTag} заявка відправлена`);
    } catch (e) {
      return this.#bot.sendMessage(chatId, errorMsg.tryLater);
    }
  }

  async removeMeFromCustomers(chatId, userId) {
    const { newCustomers } = this.#necessaryValues.creatorsIds;
    const indexOfCustomer = indexOfUser(userId, newCustomers);

    const error = checker([
      {
        check: indexOfCustomer >= 0,
        msg: errorMsg.noSuchCustomer,
      },
    ]);
    if (error) {
      return this.#bot.sendMessage(chatId, error);
    }

    try {
      await this.#necessaryValues.adminsCollection.removeCustomer(userId);
      const { tag } = newCustomers[indexOfCustomer];
      newCustomers.splice(indexOfCustomer, 1);
      return this.#bot.sendMessage(chatId, `@${tag}, ваш запит відмінено`);
    } catch (e) {
      return this.#bot.sendMessage(chatId, errorMsg.tryLater);
    }
  }

  async addAdmin(chatId, userId, customerId) {
    const { newCustomers, admins, owners } = this.#necessaryValues.creatorsIds;
    const hasAccess = hasUserAccess(userId, owners);
    const isOwner = hasUserAccess(customerId, owners);
    const isAdmin = hasUserAccess(customerId, admins);
    const indexOfCustomer = indexOfUser(customerId, newCustomers);

    const error = checker([
      {
        check: hasAccess,
        msg: errorMsg.onlyForOwner,
      },
      {
        check: isIdValid(customerId),
        msg: errorMsg.idIsNotValid,
      },
      {
        check: !isOwner,
        msg: errorMsg.alreadyOwner(customerId),
      },
      {
        check: !isAdmin,
        msg: errorMsg.alreadyAdmin(customerId),
      },
      {
        check: indexOfCustomer >= 0,
        msg: errorMsg.noSuchCustomer,
      },
    ]);
    if (error) {
      return this.#bot.sendMessage(chatId, error);
    }

    const { id, tag, description } = newCustomers[indexOfCustomer];

    try {
      await this.#necessaryValues.adminsCollection.addAdmin(
        id,
        tag,
        description
      );
      await this.#necessaryValues.adminsCollection.removeCustomer(id);
      newCustomers.splice(indexOfCustomer, 1);
      admins.push({ id, tag, description });
      return this.#bot.sendMessage(chatId, `Користувач @${tag} став адміном`);
    } catch (e) {
      return this.#bot.sendMessage(chatId, errorMsg.tryLater);
    }
  }

  async removeAdmin(chatId, userId, customerId) {
    const { admins, owners } = this.#necessaryValues.creatorsIds;
    const hasAccess = hasUserAccess(userId, owners);
    const isOwner = hasUserAccess(customerId, owners);
    const indexOfAdmin = indexOfUser(customerId, admins);

    const error = checker([
      {
        check: hasAccess,
        msg: errorMsg.onlyForOwner,
      },
      {
        check: isIdValid(customerId),
        msg: errorMsg.idIsNotValid,
      },
      {
        check: !isOwner,
        msg: errorMsg.alreadyOwner(customerId),
      },
      {
        check: indexOfAdmin >= 0,
        msg: errorMsg.noSuchAdmin,
      },
    ]);
    if (error) {
      return this.#bot.sendMessage(chatId, error);
    }

    try {
      await this.#necessaryValues.adminsCollection.removeAdmin(
        Number(customerId)
      );
      const { tag } = admins[indexOfAdmin];
      admins.splice(indexOfAdmin, 1);
      return this.#bot.sendMessage(
        chatId,
        `Права адміна відмінені для користувача @${tag}`
      );
    } catch (e) {
      return this.#bot.sendMessage(chatId, errorMsg.tryLater);
    }
  }

  async addOwner(chatId, userId, customerId) {
    const { newCustomers, owners } = this.#necessaryValues.creatorsIds;
    const hasAccess = hasUserAccess(userId, owners);
    const isOwner = hasUserAccess(customerId, owners);
    const indexOfCustomer = indexOfUser(customerId, newCustomers);

    const error = checker([
      {
        check: hasAccess,
        msg: errorMsg.onlyForOwner,
      },
      {
        check: isIdValid(customerId),
        msg: errorMsg.idIsNotValid,
      },
      {
        check: !isOwner,
        msg: errorMsg.alreadyOwner(customerId),
      },
      {
        check: indexOfCustomer >= 0,
        msg: errorMsg.noSuchCustomer,
      },
    ]);
    if (error) {
      return this.#bot.sendMessage(chatId, error);
    }

    const { id, tag, description } = newCustomers[indexOfCustomer];
    try {
      await this.#necessaryValues.adminsCollection.addOwner(
        id,
        tag,
        description
      );
      await this.#necessaryValues.adminsCollection.removeCustomer(id);
      newCustomers.splice(indexOfCustomer, 1);
      owners.push({ id, tag, description });
      return this.#bot.sendMessage(chatId, `Користувач @${tag} став власником`);
    } catch (e) {
      return this.#bot.sendMessage(chatId, errorMsg.tryLater);
    }
  }

  async removeOwner(chatId, userId, customerId) {
    const { owners } = this.#necessaryValues.creatorsIds;
    const hasAccess = hasUserAccess(userId, owners);
    const indexOfOwner = indexOfUser(customerId, owners);
    console.log(typeof userId, typeof customerId);
    const error = checker([
      {
        check: hasAccess,
        msg: errorMsg.onlyForOwner,
      },
      {
        check: isIdValid(customerId),
        msg: errorMsg.idIsNotValid,
      },
      {
        check: indexOfOwner >= 0,
        msg: errorMsg.noSuchOwner,
      },
      {
        check: userId !== Number(customerId),
        msg: errorMsg.noDeleteYourself,
      },
    ]);
    if (error) {
      return this.#bot.sendMessage(chatId, error);
    }

    try {
      await this.#necessaryValues.adminsCollection.removeOwner(
        Number(customerId)
      );
      const { tag } = owners[indexOfOwner];
      owners.splice(indexOfOwner, 1);
      return this.#bot.sendMessage(
        chatId,
        `Права власника відмінені для користувача @${tag}`
      );
    } catch (e) {
      return this.#bot.sendMessage(chatId, errorMsg.tryLater);
    }
  }

  async removeFromCustomers(chatId, userId, customerId) {
    const { newCustomers, owners } = this.#necessaryValues.creatorsIds;
    const hasAccess = hasUserAccess(userId, owners);
    const indexOfCustomer = indexOfUser(customerId, newCustomers);

    const error = checker([
      {
        check: hasAccess,
        msg: errorMsg.onlyForOwner,
      },
      {
        check: isIdValid(customerId),
        msg: errorMsg.idIsNotValid,
      },
      {
        check: indexOfCustomer >= 0,
        msg: errorMsg.noSuchCustomer,
      },
    ]);
    if (error) {
      return this.#bot.sendMessage(chatId, error);
    }

    try {
      await this.#necessaryValues.adminsCollection.removeCustomer(customerId);
      const { tag } = newCustomers[indexOfCustomer];
      newCustomers.splice(indexOfCustomer, 1);
      return this.#bot.sendMessage(chatId, `Запит @${tag} відхилено`);
    } catch (e) {
      return this.#bot.sendMessage(chatId, errorMsg.tryLater);
    }
  }

  viewCustomers(chatId, userId) {
    const { owners, newCustomers } = this.#necessaryValues.creatorsIds;
    const hasAccess = hasUserAccess(userId, owners);

    const error = checker([
      {
        check: hasAccess,
        msg: errorMsg.onlyForOwner,
      },
      {
        check: newCustomers.length,
        msg: errorMsg.noNewRequests,
      },
    ]);
    if (error) {
      return this.#bot.sendMessage(chatId, error);
    }

    let result = "Список запитів: \n";

    for (const customer of newCustomers) {
      const { id, tag, description } = customer;
      result += formattedUserInfo(id, tag, description);
    }
    try {
      this.#bot.sendMessage(chatId, result, {
        parse_mode: "HTML",
      });
    } catch (e) {
      console.log(e);
      return this.#bot.sendMessage(chatId, errorMsg.tryLater);
    }
  }

  viewAdmins(chatId, userId) {
    const { owners, admins } = this.#necessaryValues.creatorsIds;
    const hasAccess = hasUserAccess(userId, owners);

    const error = checker([
      {
        check: hasAccess,
        msg: errorMsg.onlyForOwner,
      },
      {
        check: admins.length,
        msg: errorMsg.noAdmins,
      },
    ]);
    if (error) {
      return this.#bot.sendMessage(chatId, error);
    }

    let result = "Список адмінів: \n";

    for (const admin of admins) {
      const { id, tag, description } = admin;
      result += formattedUserInfo(id, tag, description);
    }
    try {
      this.#bot.sendMessage(chatId, result, {
        parse_mode: "HTML",
      });
    } catch (e) {
      console.log(e);
      return this.#bot.sendMessage(chatId, errorMsg.tryLater);
    }
  }

  viewOwners(chatId, userId) {
    const { owners } = this.#necessaryValues.creatorsIds;
    const hasAccess = hasUserAccess(userId, owners);
    const error = checker([
      {
        check: hasAccess,
        msg: errorMsg.onlyForOwner,
      },
      {
        check: owners.length,
        msg: errorMsg.noOwners,
      },
    ]);
    if (error) {
      return this.#bot.sendMessage(chatId, error);
    }

    let result = "Список власників: \n";

    for (const owner of owners) {
      const { id, tag, description } = owner;
      result += formattedUserInfo(id, tag, description);
    }
    try {
      this.#bot.sendMessage(chatId, result, { parse_mode: "HTML" });
    } catch (e) {
      console.log(e);
      return this.#bot.sendMessage(chatId, errorMsg.tryLater);
    }
  }
}

module.exports = { Executor };

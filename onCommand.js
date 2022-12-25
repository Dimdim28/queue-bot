const {
  getUpdatesType,
  generateNextVersionNumber,
  checker,
  queueNameChecker,
} = require("./helpers");

const { addMeToQueueOptions, LookMyQueuesOptions } = require("./options");

class onCommandClass {
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
    const { common, onlyForAdmin } = botData.commandsInfo;
    const { admins, owners } = creatorsIds;
    const result = [
      ...admins.map((admin) => admin.id),
      ...owners.map((owner) => owner.id),
    ].includes(userId)
      ? common.concat(onlyForAdmin)
      : common;
    return this.#bot.sendMessage(
      chatId,
      `список команд:\n\n${result.join("\n")}`
    );
  }

  async info(chatId) {
    const lastVersion =
      (await this.#necessaryValues.versionCollection.getLastVersion()) || {
        version: "1.0.0",
      };

    return this.#bot.sendMessage(
      chatId,
      `Це бот, розроблений D_im0N и Nailggy для створення черг і роботи з ними \nПоточна версія боту - ${lastVersion.version}`
    );
  }

  async viewmyqueues(chatId) {
    const options = LookMyQueuesOptions();
    return this.#bot.sendMessage(chatId, `Які черги цікавлять?`, options);
  }

  async new(queueName, chatId, userId) {
    const queueNameError = queueNameChecker(queueName);
    if (queueNameError) return this.#bot.sendMessage(chatId, queueNameError);

    const queue = await this.#necessaryValues.queuesCollection.findQueue(
      queueName
    );
    const addToQueueOptions = addMeToQueueOptions(queueName);

    const error = checker.isFalse(
      queue,
      `Черга з назвою ${queueName} вже існує!`
    ).errorMsg;
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

    const error = checker.isTrue(
      queue,
      `Черги ${queueName} вже не існує!`
    ).errorMsg;
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
    await cursor.forEach(function (obj) {
      myQueues.push(obj["name"]);
    });

    const error = checker.isTrue(
      myQueues.length,
      "Нічого не знайдено"
    ).errorMsg;
    if (error) {
      return this.#bot.sendMessage(chatId, error);
    }

    return this.#bot.sendMessage(
      chatId,
      `Знайдені черги: \n\n${myQueues.join("\n")}\n\n*Макс. ${queuesLimit}*`
    );
  }

  async delete(queueName, chatId, userId, userTag) {
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

    const error = checker
      .isTrue(queue, `Черги ${queueName} не існує!`)
      .isTrue(
        queueWithOwner,
        `@${userTag}, ви не створювали цю чергу`
      ).errorMsg;
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

    const error = checker
      .isTrue(queue, `Черги ${queueName} вже не існує!`)
      .isFalse(userInQueue, `@${userTag}, ви вже у цій черзі`).errorMsg;

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

    const error = checker
      .isTrue(queue, `Черги ${queueName} вже не існує!`)
      .isTrue(people?.length, `Черга ${queueName} зараз пуста`).errorMsg;
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
    const queue = await this.#necessaryValues.queuesCollection.findQueue(
      queueName
    );
    const people = queue?.people;
    const firstInQueueId = people && people[0]?.id;
    const isFirstOrCreator = [firstInQueueId, queue?.creatorId].includes(
      userId
    );

    const error = checker
      .isTrue(queue, `Черги ${queueName} вже не існує!`)
      .isTrue(people?.length, `Черга ${queueName} зараз пуста`)
      .isTrue(
        isFirstOrCreator,
        `@${userTag}, цю команду може виконути лише перший у черзі або той, хто її створював!`
      ).errorMsg;
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

    const error = checker
      .isTrue(queue, `Черги ${queueName} вже не існує!`)
      .isTrue(
        queueWithUser,
        `@${userTag}, ви не записані у чергу ${queueName}`
      ).errorMsg;
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
    await cursor.forEach(function (obj) {
      myQueues.push(obj["name"]);
    });

    const error = checker.isTrue(
      myQueues.length,
      `@${userTag}, Ви нікуди не записані`
    ).errorMsg;
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
    await cursor.forEach(function (obj) {
      myQueues.push(obj["name"]);
    });

    const error = checker.isTrue(
      myQueues.length,
      `@${userTag}, Ви не створили жодної черги`
    ).errorMsg;
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

  async newVersion(chatId, userId, description) {
    const { admins, owners } = this.#necessaryValues.creatorsIds;
    if (![...admins, ...owners].includes(userId))
      return this.#bot.sendMessage(
        chatId,
        "Це можуть зробити тільки розробники бота"
      );
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
    if (![...admins, ...owners].includes(userId))
      return this.#bot.sendMessage(
        chatId,
        "Це можуть зробити тільки розробники бота"
      );
    const versionPattern = /\d+\.\d+\.\d+/;
    const versionIndex = description.indexOf(description.match(versionPattern));
    if (versionIndex < 0)
      return this.#bot.sendMessage(
        chatId,
        "Ви не ввели номер версії яку хочете змінити"
      );
    const descrWithoutNumber = description.slice(0, versionIndex).trim(),
      number = description.slice(versionIndex);

    if (!descrWithoutNumber)
      return this.#bot.sendMessage(chatId, "Ви перед номером додайте опис!");
    const foundObject =
      await this.#necessaryValues.versionCollection.getVersion(number);
    if (!foundObject)
      return this.#bot.sendMessage(chatId, "Не знайдено такої версії!");
    await this.#necessaryValues.versionCollection.updateVersionInfo(number, {
      description: descrWithoutNumber,
    });
    return this.#bot.sendMessage(chatId, "Успішно змінено");
  }

  async getVersionInfo(chatId, version) {
    const versionPattern = /\d+\.\d+\.\d+/;
    if (!versionPattern.test(version))
      return this.#bot.sendMessage(
        chatId,
        "Вкажіть версію про яку хочете почитати, наприклад 1.0.0"
      );

    const foundObject =
      await this.#necessaryValues.versionCollection.getVersion(version);
    if (!foundObject)
      return this.#bot.sendMessage(chatId, "Не знайдено такої версії!");
    return this.#bot.sendMessage(
      chatId,
      `Версія ${version}:\nЧас створення:${foundObject.date.toString()}\nІнформація про версію:${
        foundObject.description
      } `
    );
  }

  async getPreviousVersions(chatId, count) {
    let cursor,
      result = "",
      resultLength = 0,
      resultCount = 0;
    const number = Number(count.replace(/\D/, ""));
    const temp = number || 10;
    const versionCollection = this.#necessaryValues.versionCollection;
    cursor = await versionCollection.getPreviousVersions().sort({ _id: -1 });
    const versions = [];
    await cursor.forEach(function (obj) {
      const { version, date, description } = obj;
      if (temp > versions.length) versions.push({ version, date, description });
    });

    if (!versions.length)
      return this.#bot.sendMessage(chatId, "Існує тільки 1 версія");

    const infoAboutVersion = (obj) =>
      `Версія ${
        obj.version
      }:\nЧас створення:${obj.date.toString()}\nІнформація про версію:${
        obj.description
      }`;
    for (const obj of versions) {
      const versionLine = `${infoAboutVersion(obj)}\n`;
      const versionLinelength = versionLine.length;
      result += versionLine;
      resultLength += versionLinelength;
      resultCount++;
      if (resultLength >= 3000)
        return this.#bot.sendMessage(
          chatId,
          `Надто довге повідомлення. Довжина - ${resultLength}, максимум можна вивести ${--resultCount}`
        );
    }
    return this.#bot.sendMessage(chatId, result);
  }

  async sendInfoAboutVersion(chatId) {
    if (!this.#necessaryValues.creatorsIds.includes(chatId))
      return this.#bot.sendMessage(
        chatId,
        "Тільки у чаті з ботом і тільки розробники можуть це зробити!!"
      );
    const lastVersion =
      (await this.#necessaryValues.versionCollection.getLastVersion()) || {
        version: "1.0.0",
        date: "це секрет)",
        description: "Перша версія боту, він вміє створювати черги",
      };

    for (const chatId of this.#necessaryValues.chatIds) {
      try {
        this.#bot.sendMessage(
          chatId,
          `Бот знову активний!\n\n Поточна версія боту ${lastVersion.version}\n\nДата створення ${lastVersion.date}\n\nОсновні зміни:\n\n${lastVersion.description}`
        );
      } catch (error) {
        console.log(error);
      }
    }
    return;
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
    if (!description) {
      return this.#bot.sendMessage(
        chatId,
        "Ви не ввели опис до вашого повідомлення =)"
      );
    }
    const { newCustomers, owners, admins } = this.#necessaryValues.creatorsIds;
    for (const customer of newCustomers) {
      if (customer.id === userId)
        return this.#bot.sendMessage(chatId, "Ви вже відправляли запит!");
    }

    for (const admin of admins) {
      if (admin.id === userId)
        return this.#bot.sendMessage(chatId, "Ви вже адмін!!");
    }

    for (const owner of owners) {
      if (owner.id === userId)
        return this.#bot.sendMessage(chatId, "Ви вже розробник!!");
    }

    try {
      await this.#necessaryValues.adminsCollection.addNewCustomer(
        userId,
        userTag,
        description
      );
    } catch (e) {
      return this.#bot.sendMessage(
        chatId,
        "сталася помилка, спробуйте пізніше"
      );
    } finally {
      newCustomers.push({ id: userId, tag: userTag, description });
      return this.#bot.sendMessage(chatId, `@${userTag} заявка відправлена`);
    }
  }

  async removeMeFromCustomers(chatId, userId) {
    const { newCustomers } = this.#necessaryValues.creatorsIds;
    let foundId;
    for (let i = 0; i < newCustomers.length; i++) {
      if (newCustomers[i].id == userId) foundId = i;
    }
    if (!foundId && foundId !== 0)
      return this.#bot.sendMessage(chatId, "Ви не відправляли запит!");
    try {
      await this.#necessaryValues.adminsCollection.removeCustomer(userId);
    } catch (e) {
      return this.#bot.sendMessage(
        chatId,
        "сталася помилка, спробуйте пізніше"
      );
    } finally {
      const { tag } = newCustomers[foundId];
      newCustomers.splice(foundId, 1);
      return this.#bot.sendMessage(chatId, `@${tag}, ваш запит відмінено`);
    }
  }

  async addAdmin(chatId, userId, customerId) {
    const { newCustomers, admins, owners } = this.#necessaryValues.creatorsIds;
    let foundCustomerId, foundAdminId, isOwner;
    for (const owner of owners) {
      if (owner.id === userId) {
        isOwner = true;
        break;
      }
    }
    if (!isOwner)
      return this.#bot.sendMessage(
        chatId,
        "Це може зробити лише власник боту!"
      );

    if (!/^\d+$/.test(customerId))
      return this.#bot.sendMessage(
        chatId,
        "Введіть правильний Id користувача!!"
      );

    for (let i = 0; i < newCustomers.length; i++) {
      if (newCustomers[i].id == customerId) foundCustomerId = i;
    }

    if (!foundCustomerId && foundCustomerId !== 0)
      return this.#bot.sendMessage(
        chatId,
        "Цей користувач не відправляв запит"
      );

    for (let i = 0; i < admins.length; i++) {
      if (admins[i].id == customerId) foundAdminId = i;
    }

    if (foundAdminId)
      return this.#bot.sendMessage(chatId, "Цей користувач вже адмін!");

    const { id, tag, description } = newCustomers[foundCustomerId];

    try {
      await this.#necessaryValues.adminsCollection.addAdmin(
        id,
        tag,
        description
      );
      await this.#necessaryValues.adminsCollection.removeCustomer(id);
    } catch (e) {
      return this.#bot.sendMessage(
        chatId,
        "сталася помилка, спробуйте пізніше"
      );
    } finally {
      newCustomers.splice(foundCustomerId, 1);
      admins.push({ id, tag, description });
      return this.#bot.sendMessage(chatId, `Користувач @${tag} став адміном`);
    }
  }

  async removeAdmin(chatId, userId, customerId) {
    const { admins, owners } = this.#necessaryValues.creatorsIds;
    let foundAdminId, isOwner;

    for (const owner of owners) {
      if (owner.id === userId) {
        isOwner = true;
        break;
      }
    }

    if (!isOwner)
      return this.#bot.sendMessage(
        chatId,
        "Це може зробити лише власник боту!"
      );

    if (!/^\d+$/.test(customerId))
      return this.#bot.sendMessage(
        chatId,
        "Введіть правильний Id користувача!!"
      );

    for (let i = 0; i < admins.length; i++) {
      if (admins[i].id == customerId) foundAdminId = i;
    }
    if (!foundAdminId && foundAdminId !== 0)
      return this.#bot.sendMessage(chatId, "Такого адміна немає!");
    try {
      await this.#necessaryValues.adminsCollection.removeAdmin(
        Number(customerId)
      );
    } catch (e) {
      return this.#bot.sendMessage(
        chatId,
        "сталася помилка, спробуйте пізніше"
      );
    } finally {
      const { tag } = admins[foundAdminId];
      admins.splice(foundAdminId, 1);
      return this.#bot.sendMessage(
        chatId,
        `Права адміна відмінені для користувача @${tag}`
      );
    }
  }

  async addOwner(chatId, userId, customerId) {
    const { newCustomers, admins, owners } = this.#necessaryValues.creatorsIds;
    let foundCustomerId, foundOwnerId, isOwner;

    for (const owner of owners) {
      if (owner.id === userId) {
        isOwner = true;
        break;
      }
    }

    if (!isOwner)
      return this.#bot.sendMessage(
        chatId,
        "Це може зробити лише власник боту!"
      );

    if (!/^\d+$/.test(customerId))
      return this.#bot.sendMessage(
        chatId,
        "Введіть правильний Id користувача!!"
      );

    for (let i = 0; i < newCustomers.length; i++) {
      if (newCustomers[i].id == customerId) foundCustomerId = i;
    }

    if (!foundCustomerId && foundCustomerId !== 0)
      return this.#bot.sendMessage(
        chatId,
        "Цей користувач не відправляв запит"
      );

    for (let i = 0; i < owners.length; i++) {
      if (owners[i].id == customerId) foundOwnerId = i;
    }

    if (foundOwnerId)
      return this.#bot.sendMessage(
        chatId,
        "Цей користувач вже розробник боту!"
      );

    const { id, tag, description } = newCustomers[foundCustomerId];

    try {
      await this.#necessaryValues.adminsCollection.addOwner(
        id,
        tag,
        description
      );
      await this.#necessaryValues.adminsCollection.removeCustomer(id);
    } catch (e) {
      return this.#bot.sendMessage(
        chatId,
        "сталася помилка, спробуйте пізніше"
      );
    } finally {
      newCustomers.splice(foundCustomerId, 1);
      owners.push({ id, tag, description });
      return this.#bot.sendMessage(
        chatId,
        `Користувач @${tag} став розробником`
      );
    }
  }

  async removeOwner(chatId, userId, customerId) {
    const { owners } = this.#necessaryValues.creatorsIds;
    let foundOwnerId, isOwner;

    for (const owner of owners) {
      if (owner.id === userId) {
        isOwner = true;
        break;
      }
    }

    if (!isOwner)
      return this.#bot.sendMessage(
        chatId,
        "Це може зробити лише власник боту!"
      );

    if (!/^\d+$/.test(customerId))
      return this.#bot.sendMessage(
        chatId,
        "Введіть правильний Id користувача!!"
      );

    for (let i = 0; i < owners.length; i++) {
      if (owners[i].id == customerId) foundOwnerId = i;
    }
    if (!foundOwnerId && foundOwnerId !== 0)
      return this.#bot.sendMessage(chatId, "Такого адміна немає!");
    try {
      await this.#necessaryValues.adminsCollection.removeOwner(
        Number(customerId)
      );
    } catch (e) {
      return this.#bot.sendMessage(
        chatId,
        "сталася помилка, спробуйте пізніше"
      );
    } finally {
      const { tag } = owners[foundOwnerId];
      owners.splice(foundOwnerId, 1);
      return this.#bot.sendMessage(
        chatId,
        `Права розробника відмінені для користувача @${tag}`
      );
    }
  }

  async removeFromCustomers(chatId, userId, customerId) {
    const { owners, newCustomers } = this.#necessaryValues.creatorsIds;
    let foundCustomerId, isOwner;

    for (const owner of owners) {
      if (owner.id === userId) {
        isOwner = true;
        break;
      }
    }

    if (!isOwner)
      return this.#bot.sendMessage(
        chatId,
        "Це може зробити лише власник боту!"
      );

    if (!/^\d{10}$/.test(customerId))
      return this.#bot.sendMessage(
        chatId,
        "Введіть правильний Id користувача!!"
      );

    for (let i = 0; i < newCustomers.length; i++) {
      if (newCustomers[i].id == customerId) foundCustomerId = i;
    }
    if (!foundCustomerId && foundCustomerId !== 0)
      return this.#bot.sendMessage(chatId, "Не знайдено запит!");
    try {
      await this.#necessaryValues.adminsCollection.removeCustomer(customerId);
    } catch (e) {
      return this.#bot.sendMessage(
        chatId,
        "сталася помилка, спробуйте пізніше"
      );
    } finally {
      const { tag } = newCustomers[foundCustomerId];
      newCustomers.splice(foundCustomerId, 1);
      return this.#bot.sendMessage(chatId, `Запит @${tag} відмінено`);
    }
  }
}

module.exports = { onCommandClass };

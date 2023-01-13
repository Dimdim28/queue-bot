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
} = require("./helpers");

const { addMeToQueueOptions, LookMyQueuesOptions } = require("./options");

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
      `Це бот, розроблений D_im0N и Nailggy для створення черг і роботи з ними \nПоточна версія боту - ${lastVersion.version}`
    );
  }

  async viewmyqueues(chatId) {
    const options = LookMyQueuesOptions();
    return this.#bot.sendMessage(chatId, `Які черги цікавлять?`, options);
  }

  async newQueue(queueName, chatId, userId) {
    const queueNameError = queueNameChecker(queueName);
    if (queueNameError) return this.#bot.sendMessage(chatId, queueNameError);

    const queue = await this.#necessaryValues.queuesCollection.findQueue(
      queueName
    );
    const addToQueueOptions = addMeToQueueOptions(queueName);
    
    const error = checker([
      { 
        check: !queue, 
        msg: `Черга з назвою ${queueName} вже існує!`,
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
        msg: `Черги ${queueName} вже не існує!`,
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
    await cursor.forEach(function (obj) {
      myQueues.push(obj["name"]);
    });

    const error = checker([
      { 
        check: myQueues.length, 
        msg: "Нічого не знайдено",
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
        msg: `Черги ${queueName} не існує!`,
      },
      { 
        check: queueWithOwner, 
        msg: `@${userTag}, ви не створювали цю чергу`,
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
        msg: `Черги ${queueName} вже не існує!`,
      },
      { 
        check: !userInQueue, 
        msg: `@${userTag}, ви вже у цій черзі`,
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
        msg: `Черги ${queueName} вже не існує!`,
      },
      { 
        check: people?.length, 
        msg: `Черга ${queueName} зараз пуста`,
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
        msg: `Черги ${queueName} вже не існує!`,
      },
      { 
        check: people?.length, 
        msg: `Черга ${queueName} зараз пуста`,
      },
      { 
        check: isFirstOrCreator, 
        msg: `@${userTag}, цю команду може виконути лише перший у черзі або той, 
          хто її створював!`,
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
        msg: `Черги ${queueName} вже не існує!`,
      },
      { 
        check: queueWithUser, 
        msg: `@${userTag}, ви не записані у чергу ${queueName}`,
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
    await cursor.forEach(function (obj) {
      myQueues.push(obj["name"]);
    });

    const error = checker([
      { 
        check: myQueues.length, 
        msg: `@${userTag}, Ви нікуди не записані`,
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
    await cursor.forEach(function (obj) {
      myQueues.push(obj["name"]);
    });

    const error = checker([
      { 
        check: myQueues.length, 
        msg: `@${userTag}, Ви не створили жодної черги`,
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

  async newVersion(chatId, userId, description) {
    const { admins, owners } = this.#necessaryValues.creatorsIds;
    const hasAccess = hasUserAccess(userId, owners, admins);

    const error = checker([
      { 
        check: hasAccess, 
        msg: "У вас недостатньо прав",
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
        msg: "У вас недостатньо прав",
      },
      { 
        check: isVersionSpecified, 
        msg: "Ви не ввели номер версії яку хочете змінити",
      },
      { 
        check: descrWithoutNumber, 
        msg: "Додайте опис перед номером!",
      },
      { 
        check: isNumberValid, 
        msg: "Неправильна форма номеру версії",
      },
      { 
        check: foundObject, 
        msg: "Не знайдено такої версії!",
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
        msg: "Вкажіть версію про яку хочете почитати, наприклад 1.0.0",
      },
      { 
        check: foundObject, 
        msg: "Не знайдено такої версії!",
      },
    ]);  
    if (error) {
      return this.#bot.sendMessage(chatId, error);
    } 

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
    const limit = 3000;
    const number = Number(count.replace(/\D/, ""));
    const temp = number || 10;
    const versionCollection = this.#necessaryValues.versionCollection;
    cursor = await versionCollection.getPreviousVersions().sort({ _id: -1 });
    const versions = [];
    await cursor.forEach(function (obj) {
      const { version, date, description } = obj;
      if (temp > versions.length) versions.push({ version, date, description });
    });

    const infoAboutVersion = (obj) => `Версія ${obj.version}:\n` 
    + `Час створення: ${obj.date.toString()}\n`
    + `Інформація про версію: ${obj.description}`;
      
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
        msg: "Існує тільки 1 версія",
      },
      { 
        check: resultLength < limit, 
        msg: "Надто довге повідомлення. "
        + `Довжина - ${resultLength}, максимум можна вивести ${--resultCount}`,
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
        msg: "Тільки у чаті з ботом і тільки розробники можуть це зробити!",
      },
    ]);  
    if (error) {
      return this.#bot.sendMessage(chatId, error);
    }

    const lastVersion = (await this.#necessaryValues.versionCollection.getLastVersion()) 
    || {
        version: "1.0.0",
        date: "це секрет)",
        description: "Перша версія боту, він вміє створювати черги",
      };

    for (const chatId of this.#necessaryValues.chatIds) {
      try {
        const text = "Бот знову активний!\n\n"
        + `Поточна версія боту ${lastVersion.version}\n\n`
        + `Дата створення ${lastVersion.date}\n\n`
        + `Основні зміни:\n\n${lastVersion.description}`;

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
        msg: "Тільки у чаті з ботом і тільки розробники можуть це зробити!",
      },
    ]);  
    if (error) {
      return this.#bot.sendMessage(chatId, error);
    }

    for (const chatId of this.#necessaryValues.chatIds) {
      try {
        this.#bot.sendMessage(chatId, `Почалися технічні роботи`);
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
        msg: "Ви не ввели опис до вашого повідомлення!",
      },
      { 
        check: !isOwner, 
        msg: "Ви вже розробник!",
      },
      { 
        check: !isAdmin, 
        msg: "Ви вже адмін!",
      },
      { 
        check: !isCustomer, 
        msg: "Ви вже відправляли запит!",
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
    const indexOfCustomer = indexOfUser(userId, newCustomers);

    const error = checker([
      { 
        check: indexOfCustomer >= 0, 
        msg: "Ви не відправляли запит!",
      },
    ]);
    if (error) {
      return this.#bot.sendMessage(chatId, error);
    }

    try {
      await this.#necessaryValues.adminsCollection.removeCustomer(userId);
    } catch (e) {
      return this.#bot.sendMessage(
        chatId,
        "сталася помилка, спробуйте пізніше"
      );
    } finally {
      const { tag } = newCustomers[indexOfCustomer];
      newCustomers.splice(indexOfCustomer, 1);
      return this.#bot.sendMessage(chatId, `@${tag}, ваш запит відмінено`);
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
        msg: "Це може зробити лише власник боту!",
      },
      { 
        check: isIdValid(customerId), 
        msg: "Введіть правильний id користувача!",
      },
      { 
        check: !isOwner, 
        msg: "Цей користувач є власником!",
      },
      { 
        check: !isAdmin, 
        msg: "Цей користувач вже адмін!",
      },
      { 
        check: indexOfCustomer >= 0, 
        msg: "Цей користувач не відправляв запит",
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
    } catch (e) {
      return this.#bot.sendMessage(
        chatId,
        "сталася помилка, спробуйте пізніше"
      );
    } finally {
      newCustomers.splice(indexOfCustomer, 1);
      admins.push({ id, tag, description });
      return this.#bot.sendMessage(chatId, `Користувач @${tag} став адміном`);
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
        msg: "Це може зробити лише власник боту!",
      },
      { 
        check: isIdValid(customerId), 
        msg: "Введіть правильний id користувача!",
      },
      { 
        check: !isOwner, 
        msg: "Цей користувач є власником!",
      },
      { 
        check: indexOfAdmin >= 0, 
        msg: "Такого адміна немає",
      },
    ]);
    if (error) {
      return this.#bot.sendMessage(chatId, error);
    }

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
      const { tag } = admins[indexOfAdmin];
      admins.splice(indexOfAdmin, 1);
      return this.#bot.sendMessage(
        chatId,
        `Права адміна відмінені для користувача @${tag}`
      );
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
        msg: "Це може зробити лише власник боту!",
      },
      { 
        check: isIdValid(customerId), 
        msg: "Введіть правильний id користувача!",
      },
      { 
        check: !isOwner, 
        msg: "Цей користувач є власником!",
      },
      { 
        check: indexOfCustomer >= 0, 
        msg: "Цей користувач не відправляв запит",
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
    } catch (e) {
      return this.#bot.sendMessage(
        chatId,
        "сталася помилка, спробуйте пізніше"
      );
    } finally {
      newCustomers.splice(indexOfCustomer, 1);
      owners.push({ id, tag, description });
      return this.#bot.sendMessage(
        chatId,
        `Користувач @${tag} став розробником`
      );
    }
  }

  async removeOwner(chatId, userId, customerId) {
    const { owners } = this.#necessaryValues.creatorsIds;
    const hasAccess = hasUserAccess(userId, owners);
    const indexOfOwner = indexOfUser(customerId, owners);
    
    const error = checker([
      { 
        check: hasAccess, 
        msg: "Це може зробити лише власник боту!",
      },
      { 
        check: isIdValid(customerId), 
        msg: "Введіть правильний id користувача!",
      },
      { 
        check: indexOfOwner >= 0, 
        msg: "Такого власника немає!",
      },
      { 
        check: userId != customerId, 
        msg: "Не можна видалити себе із власників!",
      },
    ]);
    if (error) {
      return this.#bot.sendMessage(chatId, error);
    }

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
      const { tag } = owners[indexOfOwner];
      owners.splice(indexOfOwner, 1);
      return this.#bot.sendMessage(
        chatId,
        `Права розробника відмінені для користувача @${tag}`
      );
    }
  }

  async removeFromCustomers(chatId, userId, customerId) {
    const { newCustomers, owners  } = this.#necessaryValues.creatorsIds;
    const hasAccess = hasUserAccess(userId, owners);
    const indexOfCustomer = indexOfUser(customerId, newCustomers);

    const error = checker([
      { 
        check: hasAccess, 
        msg: "Це може зробити лише власник боту!",
      },
      { 
        check: isIdValid(customerId), 
        msg: "Введіть правильний id користувача!",
      },
      { 
        check: indexOfCustomer >= 0, 
        msg: "Цей користувач не відправляв запит",
      },
    ]);
    if (error) {
      return this.#bot.sendMessage(chatId, error);
    }

    try {
      await this.#necessaryValues.adminsCollection.removeCustomer(customerId);
    } catch (e) {
      return this.#bot.sendMessage(
        chatId,
        "сталася помилка, спробуйте пізніше"
      );
    } finally {
      const { tag } = newCustomers[indexOfCustomer];
      newCustomers.splice(indexOfCustomer, 1);
      return this.#bot.sendMessage(chatId, `Запит @${tag} відхилено`);
    }
  }

  viewCustomers(chatId, userId) {
    const { owners, newCustomers } = this.#necessaryValues.creatorsIds;
    const hasAccess = hasUserAccess(userId, owners);

    const error = checker([
      { 
        check: hasAccess, 
        msg: "Це може зробити лише власник боту!",
      },
      { 
        check: newCustomers.length, 
        msg: "Нових запитів немає",
      },
    ]);
    if (error) {
      return this.#bot.sendMessage(chatId, error);
    }

    let result = "Список запитів: \n";

    for (const customer of newCustomers) {
      const { id, tag, description } = customer;
      result += `<b>id</b> - <i>${id}</i>\n<b>tag</b> - <i>@${tag}</i>\n<b>description</b> - <i>${description}</i>\n\n`;
    }
    try {
      this.#bot.sendMessage(chatId, result, {
        parse_mode: "HTML",
      });
    } catch (e) {
      console.log(e);
    }
  }

  viewAdmins(chatId, userId) {
    const { owners, admins } = this.#necessaryValues.creatorsIds;
    const hasAccess = hasUserAccess(userId, owners);

    const error = checker([
      { 
        check: hasAccess, 
        msg: "Це може зробити лише власник боту!",
      },
      { 
        check: admins.length, 
        msg: "Адмінів поки що немає",
      },
    ]);
    if (error) {
      return this.#bot.sendMessage(chatId, error);
    }

    let result = "Список адмінів: \n";

    for (const admin of admins) {
      const { id, tag, description } = admin;
      result += `<b>id</b> - <i>${id}</i>\n<b>tag</b> - <i>@${tag}</i>\n<b>description</b> - <i>${description}</i>\n\n`;
    }
    try {
      this.#bot.sendMessage(chatId, result, {
        parse_mode: "HTML",
      });
    } catch (e) {
      console.log(e);
    }
  }

  viewOwners(chatId, userId) {
    const { owners } = this.#necessaryValues.creatorsIds;
    const hasAccess = hasUserAccess(userId, owners);
    const error = checker([
      { 
        check: hasAccess, 
        msg: "Це може зробити лише власник боту!",
      },
      { 
        check: owners.length, 
        msg: "Розробників поки що немає",
      },
    ]);
    if (error) {
      return this.#bot.sendMessage(chatId, error);
    }

    let result = "Список розробників: \n";

    for (const owner of owners) {
      const { id, tag, description } = owner;
      result += `<b>id</b> - <i>${id}</i>\n<b>tag</b> - <i>@${tag}</i>\n<b>description</b> - <i>${description}</i>\n\n`;
    }
    try {
      this.#bot.sendMessage(chatId, result, {
        parse_mode: "HTML",
      });
    } catch (e) {
      console.log(e);
    }
  }
}

module.exports = { Executor };

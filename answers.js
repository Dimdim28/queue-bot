'use strict';

const errorMsg = {
  queueExists(queueName) {
    return `Черга з назвою ${queueName} вже існує`;
  },

  queueDoesNotExist(queueName) {
    return `Черги ${queueName} не існує`;
  },

  queueIsEmpty(queueName) {
    return `Черга ${queueName} зараз пуста`;
  },

  notACreator(userTag) {
    return `@${userTag}, ви не створювали цю чергу`;
  },

  alreadyInQueue(userTag, queueName) {
    return `@${userTag}, ви вже у черзі ${queueName}`;
  },

  notInQueue(userTag, queueName) {
    `@${userTag}, ви не записані у чергу ${queueName}`;
  },

  notFirstOrCreator(userTag) {
    return `@${userTag}, ` +
    'цю команду може виконути лише перший у черзі або той, хто її створював';
  },

  noJoinedQueues(userTag) {
    return `@${userTag}, Ви нікуди не записані`;
  },

  noCreatedQueues(userTag) {
    return `@${userTag}, Ви не створили жодної черги`;
  },

  msgTooLong(length, maxToShow) {
    return 'Надто довге повідомлення. ' +
    `Довжина - ${length}, максимум можна вивести ${maxToShow}`;
  },

  alreadyOwner(userId) {
    return `${userId} вже є власником`;
  },

  alreadyAdmin(userId) {
    return `${userId} вже є адміном`;
  },

  alreadyCustomer(userId) {
    return `${userId} вже відправляв запит`;
  },

  noVersion: 'Ви не ввели номер версії',
  noDescription: 'Ви не ввели опис',
  incorrectVersionNumber: 'Неправильна форма номеру версії',
  noVersionFound: 'Не знайдено такої версії',
  onlyOneVersionExists: 'Існує тільки 1 версія',
  idIsNotValid: 'Введіть правильний id користувача',
  tryLater: 'сталася помилка, спробуйте пізніше',
  nothingFound: 'Нічого не знайдено',

  noAccess: 'У вас недостатньо прав',
  onlyForOwner: 'Це може зробити лише власник боту',
  notInOwnerChat: 'Тільки у чаті з ботом і тільки власники можуть це зробити!',
  noSuchOwner: 'Такого власника немає',
  noSuchAdmin: 'Такого адміна немає',
  noSuchCustomer: 'Запиту від такого користувача не знайдено',
  noDeleteYourself: 'Не можна видалити себе із власників',
  noOwners: 'Власників поки що немає',
  noAdmins: 'Адмінів поки що немає',
  noNewRequests: 'Нових запитів немає',
};

module.exports = { errorMsg };

const addMeToQueueOptions = (queueName) => ({
  reply_markup: JSON.stringify({
    inline_keyboard: [
      [
        {
          text: "Записатися",
          callback_data: `addMeToQueue:${queueName}`,
        },
      ],
      [
        {
          text: "Подивитися черги",
          callback_data: `viewQueue:${queueName}`,
        },
      ],
      [
        {
          text: "Залишити чергу і тегнути наступного",
          callback_data: `tagNext:${queueName}`,
        },
      ],
      [
        {
          text: "Виписатися",
          callback_data: `removeMeFromQueue:${queueName}`,
        },
      ],
    ],
  }),
});

const LookMyQueuesOptions = () => ({
  reply_markup: JSON.stringify({
    inline_keyboard: [
      [
        {
          text: "Подивитися куди я записаний",
          callback_data: `lookMyQueues`,
        },
      ],
      [
        {
          text: "Подивитися створені мною черги",
          callback_data: `lookMyOwnQueues`,
        },
      ],
    ],
  }),
});

module.exports = { addMeToQueueOptions, LookMyQueuesOptions };

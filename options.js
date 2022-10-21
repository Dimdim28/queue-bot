const addMeToQueueOptions = (queueName) => ({
  reply_markup: JSON.stringify({
    inline_keyboard: [
      [
        {
          text: "Записаться",
          callback_data: `addMeToQueue:${queueName}`,
        },
      ],
      [
        {
          text: "Посмотреть очередь",
          callback_data: `viewQueue:${queueName}`,
        },
      ],
      [
        {
          text: "Выйти и тегнуть следующего",
          callback_data: `tagNext:${queueName}`,
        },
      ],
      [
        {
          text: "Выписаться",
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
          text: "Посмотреть куда я записан",
          callback_data: `lookMyQueues`,
        },
      ],
      [
        {
          text: "Посмотреть созданные мной очереди",
          callback_data: `lookMyOwnQueues`,
        },
      ],
    ],
  }),
});

module.exports = { addMeToQueueOptions, LookMyQueuesOptions };

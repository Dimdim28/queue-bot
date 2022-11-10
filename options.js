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
          text: "Подивитися чергу",
          callback_data: `viewQueue:${queueName}`,
        },
      ],
      [
        {
          text: "Наступний",
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
          text: "Подивитися куди я записаний(-а)",
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

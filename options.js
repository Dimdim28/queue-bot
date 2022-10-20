const addMeToQueueOptions = (baseName) => ({
  reply_markup: JSON.stringify({
    inline_keyboard: [
      [
        {
          text: "Записаться",
          callback_data: `addMeToQueue:${baseName}`,
        },
      ],
      [
        {
          text: "Посмотреть очередь",
          callback_data: `viewQueue:${baseName}`,
        },
      ],
      [
        {
          text: "Выписаться",
          callback_data: `removeMeFromQueue:${baseName}`,
        },
      ],
    ],
  }),
});

module.exports = { addMeToQueueOptions };

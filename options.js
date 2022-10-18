const addMeToQueueOptions = (baseName) => ({
  reply_markup: JSON.stringify({
    inline_keyboard: [
      [
        {
          text: "Записаться",
          callback_data: `addMeToQueue:${baseName}`,
        },
      ],
    ],
  }),
});

module.exports = { addMeToQueueOptions };

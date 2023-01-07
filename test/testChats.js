const { Chats } = require("../mongo");
const { redC, greenC } = require("./helpers");

const chatsCollection = new Chats("chats");

const checkChatsFilling = (state) => {
  const chats = state.chats;
  if (!chats) redC("chats array  --  absent");
  else greenC("chats array  --  present");
};

async function checkAddingChat() {
  const initialChatsState = await chatsCollection.getChatIds();
  const initialLength = initialChatsState.chats.length;
  await chatsCollection.addChat(666);
  const newChatsState = await chatsCollection.getChatIds();
  const chatsIds = newChatsState.chats;
  const newlength = chatsIds.length;
  const id = chatsIds[newlength - 1].id;
  if (newlength - initialLength === 1 && id === 666)
    greenC("addChat - success");
  else redC("addChat - fail");
}

async function checkDeletingChat() {
  const initialChatsState = await chatsCollection.getChatIds();
  const initialLength = initialChatsState.chats.length;
  await chatsCollection.removeChat(666);
  const newChatsState = await chatsCollection.getChatIds();
  const chatIds = newChatsState.chats;
  const newlength = chatIds.length;
  const chatsWithThisId = chatIds.filter((chat) => chat.id === 666);
  if (initialLength - newlength === 1 && chatsWithThisId.length === 0)
    greenC("removeChat - success");
  else redC("removeChat - fail");
}

async function testChatsCollection() {
  console.group("checking for chatsCollection existing");
  const chatsIds = await chatsCollection.getChatIds();
  if (!chatsIds) return redC("There are no chatsCollection!!");
  greenC("ChatsCollection is here =)");
  console.groupEnd();

  console.group("checking for chatsCollection initial filling");
  checkChatsFilling(chatsIds);
  console.groupEnd();

  console.group("checking for chatsCollection methods");

  console.group("chats methods");
  await checkAddingChat();
  await checkDeletingChat();
  console.groupEnd();
  console.groupEnd();
}

module.exports = { testChatsCollection };

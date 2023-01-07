const { Queues } = require("../mongo");
const { redC, greenC } = require("./helpers");

const queuesCollection = new Queues("queues");

async function checkCreatingQueue() {
  await queuesCollection.createQueue("myqueuetest*", 666);
  const collection = await queuesCollection.find({ name: "myqueuetest*" });
  if (!collection) return redC("There are no queuesCollection!!");
  greenC("queuesCollection is here =)");
  console.groupEnd();
  console.group("checking for versionsCollection methods");
  console.group("versions methods");
  if (collection.creatorId === 666) greenC("createQueue - success");
  else redC("createQueue - fail");
}

async function checkAddingToQueue() {
  await queuesCollection.addToQueue("myqueuetest*", 777, "Valera");
  const initialCollection = await queuesCollection.find({
    name: "myqueuetest*",
  });
  const initialPeopleState = initialCollection.people;
  await queuesCollection.addToQueue("myqueuetest*", 888, "Ivan");
  const newCollection = await queuesCollection.find({ name: "myqueuetest*" });
  const newPeopleState = newCollection.people;
  const initialLength = initialPeopleState.length;
  const newLength = newPeopleState.length;
  const { id, tag } = newPeopleState[newLength - 1];
  if (newLength - initialLength === 1 && id === 888 && tag === "Ivan")
    greenC("addToQueue - success");
  else redC("addToQueue - fail");
}

async function checkRemovingFromQueue() {
  const initialCollection = await queuesCollection.find({
    name: "myqueuetest*",
  });
  const initialPeopleState = initialCollection.people;
  await queuesCollection.removeFromQueue("myqueuetest*", 888);
  const newCollection = await queuesCollection.find({ name: "myqueuetest*" });
  const newPeopleState = newCollection.people;
  const initialLength = initialPeopleState.length;
  const newLength = newPeopleState.length;
  const { id, tag } = newPeopleState[newLength - 1];
  if (initialLength - newLength === 1 && id === 777 && tag === "Valera")
    greenC("removeFromQueue - success");
  else redC("removeFromQueue - fail");
}

async function checkDeletingQueue() {
  await queuesCollection.deleteQueue("myqueuetest*");
  const foundQueue = await queuesCollection.findQueue("myqueuetest*");
  if (foundQueue === null) greenC("deleteQueue - success");
  else redC("deleteQueue - fail");
}

async function testQueuesCollection() {
  console.group("checking for queuesCollection existing");
  await checkCreatingQueue();
  await checkAddingToQueue();
  await checkRemovingFromQueue();
  await checkDeletingQueue();
  console.groupEnd();
  console.groupEnd();
  console.log("\n\n");
}

module.exports = { testQueuesCollection };

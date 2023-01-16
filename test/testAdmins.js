'use strict';

const { Admins } = require('../mongo');
const { redC, greenC } = require('./helpers');

const adminsCollection = new Admins('admins');

const checkAdminsFilling = (state) => {
  const { admins, newCustomers, owners } = state;
  if (!admins) redC('admins array  --  absent');
  else greenC('admins array  --  present');
  if (!newCustomers) redC('newCustomers array  --  absent');
  else greenC('newCustomers array  --  present');
  if (!owners) redC('owners array  --  absent ');
  else greenC('owners array  --  present');
};

async function checkAddingToRole(role, method) {
  const initialAdminsState = await adminsCollection.getAdminsIds();
  const initialLength = initialAdminsState[role].length;
  await adminsCollection[method](666, 'valeraTheBest', 'test description');
  const newAdminState = await adminsCollection.getAdminsIds();
  const adminIds = newAdminState[role];
  const newlength = adminIds.length;
  const { id, tag, description } = adminIds[newlength - 1];
  if (
    newlength - initialLength === 1 &&
    id === 666 &&
    tag === 'valeraTheBest' &&
    description === 'test description'
  )
    greenC(method, ' - success');
  else redC(method, ' - fail');
}

async function checkDeletingFromRole(role, method) {
  const initialAdminsState = await adminsCollection.getAdminsIds();
  const initialLength = initialAdminsState[role].length;

  await adminsCollection[method](666);

  const newAdminState = await adminsCollection.getAdminsIds();
  const adminIds = newAdminState[role];
  const newlength = adminIds.length;
  const usersWithThisId = adminIds.filter((user) => user.id === 666);

  if (initialLength - newlength === 1 && usersWithThisId.length === 0)
    greenC(method, ' - success');
  else redC(method, ' - fail');
}

async function testAdminsCollection() {
  console.group('checking for adminsCollection existing');
  const adminsIds = await adminsCollection.getAdminsIds();
  if (!adminsIds) return redC('There are no adminsCollection!!');
  greenC('AdminCollection is here =)');
  console.groupEnd();

  console.group('checking for adminsCollection initial filling');
  checkAdminsFilling(adminsIds);
  console.groupEnd();

  console.group('checking for adminsCollection methods');

  console.group('admins methods');
  await checkAddingToRole('admins', 'addAdmin');
  await checkDeletingFromRole('admins', 'removeAdmin');
  console.groupEnd();

  console.group('owners methods');
  await checkAddingToRole('owners', 'addOwner');
  await checkDeletingFromRole('owners', 'removeOwner');
  console.groupEnd();

  console.group('newCustomers methods');
  await checkAddingToRole('newCustomers', 'addNewCustomer');
  await checkDeletingFromRole('newCustomers', 'removeCustomer');
  console.groupEnd();
  console.groupEnd();
  console.log('\n\n');
}

module.exports = { testAdminsCollection };

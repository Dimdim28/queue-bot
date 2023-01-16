'use strict';

const { Versions } = require('../mongo');
const { redC, greenC } = require('./helpers');

const versionsCollection = new Versions('versions');

async function checkPreviousVersionsFilling(state) {
  const { version, date, description, isTheLast } = state[0];
  if (version && date && description && isTheLast === false)
    greenC('previous versions array  --  present');
  else redC('previousversions array  --  absent');
}

async function checkLastPreviousFilling(state) {
  const { version, date, description, isTheLast } = state;
  if (version && date && description && isTheLast)
    greenC('last version  --  present');
  else redC('last version  --  absent');
}

async function checkAddingVersion() {
  const currentDate = Date.now().toString();
  await versionsCollection.newVersion('0.0.666', currentDate, 'description');
  const lastVersion = await versionsCollection.getLastVersion();
  if (!lastVersion) return redC('getLastVersion - fail');
  else greenC('getLastVersion - success');
  const { version, date, description } = lastVersion;
  if (
    version === '0.0.666' &&
    date === currentDate &&
    description === 'description'
  )
    greenC('newVersion - success');
  else redC('newVersion - fail');
}

async function checkUpdatingVersion() {
  await versionsCollection.updateVersionInfo('0.0.666', {
    description: 'new description',
  });
  const lastVersion = await versionsCollection.getLastVersion();
  if (!lastVersion) return;
  const { version, description } = lastVersion;
  if (version === '0.0.666' && description === 'new description')
    greenC('updateVersionInfo - success');
  else redC('updateVersionInfo - fail');
}

async function checkGetVersion() {
  const gettedVersion = await versionsCollection.getVersion('0.0.666');
  if (!gettedVersion) return redC('getVersion - fail');
  const { version, description } = gettedVersion;
  if (version === '0.0.666' && description === 'new description')
    greenC('getVersion - success');
  else redC('getVersion - fail');
}

async function checkDeletingLastVersion(prevVersion) {
  await versionsCollection.removeLastVersion();
  const removedVersion = await versionsCollection.getVersion('0.0.666');
  const lastVersion = await versionsCollection.getLastVersion();
  const { version, isTheLast } = lastVersion;
  if (!removedVersion && prevVersion === version && isTheLast === true)
    greenC('removeLastVersion - success');
  else redC('removeLastVersion - fail');
}

async function testVersionsCollection() {
  console.group('checking for versionsCollection existing');
  const previous = await versionsCollection
    .getPreviousVersions()
    .sort({ _id: -1 })
    .limit(1)
    .toArray();
  const last = await versionsCollection.getLastVersion();
  if (!previous || !last) return redC('There are no versionsCollection!!');
  greenC('versionsCollection is here =)');
  console.groupEnd();

  console.group('checking for versionsCollection initial filling');
  checkPreviousVersionsFilling(previous);
  checkLastPreviousFilling(last);
  console.groupEnd();

  console.group('checking for versionsCollection methods');

  console.group('versions methods');
  await checkAddingVersion();
  const previousToNewVersion = last.version;
  await checkUpdatingVersion();
  await checkGetVersion();
  await checkDeletingLastVersion(previousToNewVersion);
  console.groupEnd();
  console.groupEnd();
  console.log('\n\n');
}

module.exports = { testVersionsCollection };

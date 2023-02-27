'use strict';

const botData = {
  tag: '@queue_im_bot',
  botId: 5794761816,
  commandsInfo: {
    owner: new Map([
      [
        '/addAdmin',
        ' customerId  -  дати права адміна користувачу з айді customerId',
      ],
      [
        '/removeAdmin',
        ' customerId  -  забрати права адміна у користувача з айді customerId',
      ],
      [
        '/addOwner',
        ' customerId  -  додати права розробника користувачу з айді customerId',
      ],
      [
        '/removeOwner',
        ' customerId  -  забрати права розробника' +
        ' у користувача з айді customerId',
      ],
      [
        '/removeFromCustomers',
        ' customerId  -  відмовити у наданні особливих прав' +
        ' користувачу з айді customerId',
      ],
      ['/viewCustomers', '  -  подивитись список запитів на отримання прав'],
      ['/viewAdmins', '  -  подивитись список адмінів'],
      ['/viewOwners', '  -  подивитись список розробників'],
    ]),
    admin: new Map([
      [
        '/newVersion',
        ' description updatesType -  додати інформацію про нову версію боту,' +
        ' updatesType = major, minor або patch - впливає на новий номер' +
        ' версії, що буде згенеровано програмою',
      ],
      [
        '/updateVersionDescription',
        ' description version  -  змінити інформацію про  версію боту',
      ],
      [
        '/sendInfoAboutVersion',
        ' -  надіслати у всі чати повідомлення про нову версію боту',
      ],
      [
        '/sendInfoAboutDeveloping',
        ' -  надіслати у всі чати повідомлення про початок технічних робіт',
      ],
    ]),
    common: new Map([
      ['/start', '  -  привітатися із ботом'],
      ['/info', '  -  подивитися інформацію про бота'],
      ['/help', '  -  подивитися цю підказку'],
      [
        '/getVersionInfo',
        ' version -  подивитися інформацію про певну версію боту',
      ],
      [
        '/getPreviousVersions',
        ' count -  подивитися інформацію про попередні версії боту,' +
        ' count - максимальна калькість версій що виведе(10 за замовчуванням)',
      ],
      [
        '/new',
        ' name   -   створити чергу з ім\'ям name' +
        ' (створюється пустою, нижче з\'являються кнопки для взаємодії з нею)',
      ],
      [
        '/delete',
        ' name   -   видалити чергу з ім\'ям name' +
        ' (може тільки той, хто створив чергу)',
      ],
      [
        '/viewmyqueues',
        '  -  викликати меню з кнопками для перегляду черг,' +
        ' де користувач записаний, або черг, які він створив',
      ],
      ['/find', ' partOfName -  знайти чергу в імені якої є partOfName'],
      ['/look', ' name  -  подивитися чергу з ім\'ям name'],
      [
        '/addMeToCustomers',
        '  -  надіслати запит на отримання прав адміна або розробника',
      ],
      [
        '/removeMeFromCustomers',
        '  -  відмінити запит на отримання прав адміна або розробника',
      ],
    ]),
  },
};

module.exports = { botData };

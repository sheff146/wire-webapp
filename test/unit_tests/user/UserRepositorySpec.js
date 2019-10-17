/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

import {backendConfig} from '../../api/testResolver';
import {ConsentValue} from 'src/script/user/ConsentValue';
import {PropertiesRepository} from 'src/script/properties/PropertiesRepository';
import {ReceiptMode} from 'src/script/conversation/ReceiptMode';
import {User} from 'src/script/entity/User';
import {EventRepository} from 'src/script/event/EventRepository';

describe('UserRepository', () => {
  let server = null;
  const test_factory = new TestFactory();

  beforeAll(() => test_factory.exposeUserActors());

  beforeEach(() => {
    server = sinon.fakeServer.create();
    server.autoRespond = true;
  });

  afterEach(() => {
    TestFactory.user_repository.users.removeAll();
    server.restore();
  });

  describe('Account preferences ', () => {
    beforeEach(() => {
      spyOn(TestFactory.user_repository.propertyRepository, '_publishProperties').and.callFake(properties => {
        return properties;
      });
    });

    describe('Data usage permissions', () => {
      it('syncs the "Send anonymous data" preference through WebSocket events', () => {
        const turnOnErrorReporting = {
          key: 'webapp',
          type: 'user.properties-set',
          value: {
            settings: {
              privacy: {
                improve_wire: true,
              },
            },
            version: 1,
          },
        };

        const turnOffErrorReporting = {
          key: 'webapp',
          type: 'user.properties-set',
          value: {
            settings: {
              privacy: {
                improve_wire: false,
              },
            },
            version: 1,
          },
        };

        const source = EventRepository.SOURCE.WEB_SOCKET;
        const errorReporting = () =>
          TestFactory.user_repository.propertyRepository.properties.settings.privacy.improve_wire;

        expect(errorReporting()).toBeUndefined();

        TestFactory.user_repository.onUserEvent(turnOnErrorReporting, source);

        expect(errorReporting()).toBe(true);

        TestFactory.user_repository.onUserEvent(turnOffErrorReporting, source);

        expect(errorReporting()).toBe(false);
      });

      it('syncs the "Receive newsletter" preference through WebSocket events', () => {
        const giveOnMarketingConsent = {
          key: PropertiesRepository.CONFIG.WIRE_MARKETING_CONSENT.key,
          type: 'user.properties-set',
          value: ConsentValue.GIVEN,
        };
        const revokeMarketingConsent = {
          key: PropertiesRepository.CONFIG.WIRE_MARKETING_CONSENT.key,
          type: 'user.properties-delete',
        };

        const source = EventRepository.SOURCE.WEB_SOCKET;
        const marketingConsent = TestFactory.user_repository.propertyRepository.marketingConsent;

        expect(marketingConsent()).toBe(ConsentValue.NOT_GIVEN);

        TestFactory.user_repository.onUserEvent(giveOnMarketingConsent, source);

        expect(marketingConsent()).toBe(ConsentValue.GIVEN);

        TestFactory.user_repository.onUserEvent(revokeMarketingConsent, source);

        expect(marketingConsent()).toBe(ConsentValue.NOT_GIVEN);
      });
    });

    describe('Privacy', () => {
      it('syncs the "Read receipts" preference through WebSocket events', () => {
        const turnOnReceiptMode = {
          key: PropertiesRepository.CONFIG.WIRE_RECEIPT_MODE.key,
          type: 'user.properties-set',
          value: ReceiptMode.DELIVERY_AND_READ,
        };
        const turnOffReceiptMode = {
          key: PropertiesRepository.CONFIG.WIRE_RECEIPT_MODE.key,
          type: 'user.properties-delete',
        };
        const source = EventRepository.SOURCE.WEB_SOCKET;
        const receiptMode = TestFactory.user_repository.propertyRepository.receiptMode;

        expect(receiptMode()).toBe(ReceiptMode.DELIVERY);

        TestFactory.user_repository.onUserEvent(turnOnReceiptMode, source);

        expect(receiptMode()).toBe(ReceiptMode.DELIVERY_AND_READ);

        TestFactory.user_repository.onUserEvent(turnOffReceiptMode, source);

        expect(receiptMode()).toBe(ReceiptMode.DELIVERY);
      });
    });
  });

  describe('User handling', () => {
    describe('fetchUsersById', () => {
      it('should handle malformed input', () => {
        return TestFactory.user_repository
          .fetchUsersById()
          .then(response => {
            expect(response.length).toBe(0);
            return TestFactory.user_repository.fetchUsersById([undefined, undefined, undefined]);
          })
          .then(response => {
            expect(response.length).toBe(0);
          });
      });
    });

    describe('findUserById', () => {
      let user = null;

      beforeEach(() => {
        user = new User(entities.user.john_doe.id);
        return TestFactory.user_repository.saveUser(user);
      });

      afterEach(() => {
        TestFactory.user_repository.users.removeAll();
      });

      it('should find an existing user', () => {
        const userEntity = TestFactory.user_repository.findUserById(user.id);

        expect(userEntity).toEqual(user);
      });

      it('should not find an unknown user', () => {
        const userEntity = TestFactory.user_repository.findUserById('1');

        expect(userEntity).toBe(undefined);
      });
    });

    describe('saveUser', () => {
      afterEach(() => TestFactory.user_repository.users.removeAll());

      it('saves a user', () => {
        const user = new User();
        user.id = entities.user.jane_roe.id;

        TestFactory.user_repository.saveUser(user);

        expect(TestFactory.user_repository.users().length).toBe(1);
        expect(TestFactory.user_repository.users()[0]).toBe(user);
      });

      it('saves self user', () => {
        const user = new User();
        user.id = entities.user.jane_roe.id;

        TestFactory.user_repository.saveUser(user, true);

        expect(TestFactory.user_repository.users().length).toBe(1);
        expect(TestFactory.user_repository.users()[0]).toBe(user);
        expect(TestFactory.user_repository.self()).toBe(user);
      });
    });

    describe('_assignAllClients', () => {
      let user_jane_roe = null;
      let user_john_doe = null;

      beforeEach(() => {
        TestFactory.user_repository.users.removeAll();
        user_jane_roe = new User(entities.user.jane_roe.id);
        user_john_doe = new User(entities.user.john_doe.id);

        TestFactory.user_repository.saveUsers([user_jane_roe, user_john_doe]);
        const permanent_client = TestFactory.client_repository.clientMapper.mapClient(
          entities.clients.john_doe.permanent,
        );
        const plain_client = TestFactory.client_repository.clientMapper.mapClient(entities.clients.jane_roe.plain);
        const temporary_client = TestFactory.client_repository.clientMapper.mapClient(
          entities.clients.john_doe.temporary,
        );
        const recipients = {
          [entities.user.john_doe.id]: [permanent_client, temporary_client],
          [entities.user.jane_roe.id]: [plain_client],
        };

        spyOn(TestFactory.client_repository, 'getAllClientsFromDb').and.returnValue(Promise.resolve(recipients));
      });

      afterEach(() => TestFactory.user_repository.users.removeAll());

      it('assigns all available clients to the users', () => {
        return TestFactory.user_repository._assignAllClients().then(() => {
          expect(TestFactory.client_repository.getAllClientsFromDb).toHaveBeenCalled();
          expect(user_jane_roe.devices().length).toBe(1);
          expect(user_jane_roe.devices()[0].id).toBe(entities.clients.jane_roe.plain.id);
          expect(user_john_doe.devices().length).toBe(2);
          expect(user_john_doe.devices()[0].id).toBe(entities.clients.john_doe.permanent.id);
          expect(user_john_doe.devices()[1].id).toBe(entities.clients.john_doe.temporary.id);
        });
      });
    });

    describe('verifyUsernames', () => {
      it('resolves with username when username is not taken', () => {
        const usernames = ['john_doe'];
        server.respondWith('POST', `${backendConfig.restUrl}/users/handles`, [
          200,
          {'Content-Type': 'application/json'},
          JSON.stringify(usernames),
        ]);

        return TestFactory.user_repository.verifyUsernames(usernames).then(_usernames => {
          expect(_usernames).toEqual(usernames);
        });
      });

      it('rejects when username is taken', () => {
        const usernames = ['john_doe'];
        server.respondWith('POST', `${backendConfig.restUrl}/users/handles`, [
          200,
          {'Content-Type': 'application/json'},
          JSON.stringify([]),
        ]);

        return TestFactory.user_repository.verifyUsernames(usernames).then(_usernames => {
          expect(_usernames.length).toBe(0);
        });
      });
    });

    describe('verifyUsername', () => {
      it('resolves with username when username is not taken', () => {
        const username = 'john_doe';
        server.respondWith('HEAD', `${backendConfig.restUrl}/users/handles/${username}`, [404, {}, '']);

        return TestFactory.user_repository.verifyUsername(username).then(_username => {
          expect(_username).toBe(username);
        });
      });

      it('rejects when username is taken', done => {
        const username = 'john_doe';
        server.respondWith('HEAD', `${backendConfig.restUrl}/users/handles/${username}`, [200, {}, '']);

        TestFactory.user_repository
          .verifyUsername(username)
          .then(done.fail)
          .catch(() => done());
      });
    });
  });
});

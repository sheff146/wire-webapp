/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {render} from '@testing-library/react';
import {CredentialType} from '@wireapp/core/lib/messagingProtocols/mls';

import {withTheme} from 'src/script/auth/util/test/TestUtil';
import {MLSStatuses, WireIdentity} from 'src/script/E2EIdentity';

import {E2EICertificateDetails} from './E2EICertificateDetails';

describe('E2EICertificateDetails', () => {
  const generateIdentity = (status: MLSStatuses): WireIdentity => ({
    status,
    x509Identity: {
      certificate: 'certificate',
      displayName: '',
      domain: '',
      handle: '',
      notBefore: BigInt(0),
      notAfter: BigInt(0),
      serialNumber: '',
    },
    credentialType: CredentialType.Basic,
    deviceId: '',
    clientId: '',
    thumbprint: '',
    qualifiedUserId: {
      domain: '',
      id: '',
    },
  });

  it('is e2ei identity not downloaded', async () => {
    const {getByTestId} = render(withTheme(<E2EICertificateDetails />));

    const E2EIdentityStatus = getByTestId('e2ei-identity-status');
    expect(E2EIdentityStatus.getAttribute('data-uie-value')).toEqual(MLSStatuses.NOT_ACTIVATED);
  });

  it('is e2ei identity expired', async () => {
    const identity = generateIdentity(MLSStatuses.EXPIRED);

    const {getByTestId} = render(withTheme(<E2EICertificateDetails identity={identity} />));

    const E2EIdentityStatus = getByTestId('e2ei-identity-status');
    expect(E2EIdentityStatus.getAttribute('data-uie-value')).toEqual(MLSStatuses.EXPIRED);
  });

  it('is e2ei identity revoked', async () => {
    const identity = generateIdentity(MLSStatuses.REVOKED);

    const {getByTestId} = render(withTheme(<E2EICertificateDetails identity={identity} />));

    const E2EIdentityStatus = getByTestId('e2ei-identity-status');
    expect(E2EIdentityStatus.getAttribute('data-uie-value')).toEqual(MLSStatuses.REVOKED);
  });

  it('is e2ei identity verified', async () => {
    const identity = generateIdentity(MLSStatuses.VALID);

    const {getByTestId} = render(withTheme(<E2EICertificateDetails identity={identity} />));

    const E2EIdentityStatus = getByTestId('e2ei-identity-status');
    expect(E2EIdentityStatus.getAttribute('data-uie-value')).toEqual(MLSStatuses.VALID);
  });
});

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

const E2EIdentityOidcRedirect = () => {
  const search = window.location.href.split('/#/oidc')[1];
  const urlParams = new URLSearchParams(search);

  const oidcRedirectParams: Record<string, string | null> = {
    code: urlParams.get('code'),
    state: urlParams.get('state'),
    scope: urlParams.get('scope'),
    error: urlParams.get('error'),
    errorDescription: urlParams.get('error_description'),
  };

  return (
    <div style={{display: 'flex', flexDirection: 'column', padding: '1rem'}}>
      <div style={{display: 'flex'}}>
        <h1>E2EIdentityOidcRedirectComponent</h1>
      </div>
      <>
        <div style={{display: 'flex', flexDirection: 'column'}}>
          {oidcRedirectParams &&
            Object.keys(oidcRedirectParams).map(key => (
              <p key={key}>
                {key}: {oidcRedirectParams[key]}
              </p>
            ))}
        </div>
      </>
    </div>
  );
};

export {E2EIdentityOidcRedirect};
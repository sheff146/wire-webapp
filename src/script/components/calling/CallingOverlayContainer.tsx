/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import React, {Fragment, useEffect} from 'react';

import {container} from 'tsyringe';

import {CALL_TYPE, STATE as CALL_STATE} from '@wireapp/avs';

import {useCallAlertState} from 'Components/calling/useCallAlertState';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';

import {ChooseScreen} from './ChooseScreen';
import {FullscreenVideoCall} from './FullscreenVideoCall';

import {Call} from '../../calling/Call';
import {CallingRepository} from '../../calling/CallingRepository';
import {CallingViewMode, CallState, DesktopScreenShareMenu, MuteState} from '../../calling/CallState';
import {LEAVE_CALL_REASON} from '../../calling/enum/LeaveCallReason';
import {Participant} from '../../calling/Participant';
import {useVideoGrid} from '../../calling/videoGridHandler';
import {MediaRepository} from '../../media/MediaRepository';
import {CallViewTab} from '../../view_model/CallingViewModel';

export interface CallingContainerProps {
  readonly callingRepository: CallingRepository;
  readonly mediaRepository: MediaRepository;
  readonly callState?: CallState;
  readonly toggleScreenshare: (call: Call, customScreenShareMenu: DesktopScreenShareMenu) => void;
}

const CallingContainer: React.FC<CallingContainerProps> = ({
  mediaRepository,
  callingRepository,
  callState = container.resolve(CallState),
  toggleScreenshare,
}) => {
  const {devicesHandler: mediaDevicesHandler} = mediaRepository;
  const {viewMode} = useKoSubscribableChildren(callState, ['viewMode']);
  const isDetachedWindow = viewMode === CallingViewMode.DETACHED_WINDOW;

  const {
    activeCallViewTab,
    joinedCall,
    hasAvailableScreensToShare,
    desktopScreenShareMenu: customScreenShareMenu,
  } = useKoSubscribableChildren(callState, [
    'activeCallViewTab',
    'joinedCall',
    'hasAvailableScreensToShare',
    'customScreenShareMenu',
  ]);

  const {
    maximizedParticipant,
    state: currentCallState,
    muteState,
  } = useKoSubscribableChildren(joinedCall!, ['maximizedParticipant', 'state', 'muteState']);

  const isMuted = muteState !== MuteState.NOT_MUTED;

  useEffect(() => {
    if (currentCallState === CALL_STATE.MEDIA_ESTAB && joinedCall?.initialType === CALL_TYPE.VIDEO) {
      callState.viewMode(CallingViewMode.DETACHED_WINDOW);
    }
    if (currentCallState === undefined) {
      callState.viewMode(CallingViewMode.MINIMIZED);
    }
  }, [currentCallState]);

  const videoGrid = useVideoGrid(joinedCall!);

  const changePage = (newPage: number, call: Call) => callingRepository.changeCallPage(call, newPage);

  const {clearShowAlert} = useCallAlertState();

  const leave = (call: Call) => {
    callingRepository.leaveCall(call.conversation.qualifiedId, LEAVE_CALL_REASON.MANUAL_LEAVE_BY_UI_CLICK);
    callState.activeCallViewTab(CallViewTab.ALL);
    call.maximizedParticipant(null);
    clearShowAlert();
  };

  const setMaximizedParticipant = (call: Call, participant: Participant | null) => {
    call.maximizedParticipant(participant);
  };

  const setActiveCallViewTab = (tab: CallViewTab) => {
    callState.activeCallViewTab(tab);
    if (tab === CallViewTab.ALL && joinedCall) {
      callingRepository.requestCurrentPageVideoStreams(joinedCall);
    }
  };

  const switchCameraInput = (deviceId: string) => {
    mediaDevicesHandler.currentDeviceId.videoinput(deviceId);
    callingRepository.refreshVideoInput();
  };

  const switchMicrophoneInput = (deviceId: string) => {
    mediaDevicesHandler.currentDeviceId.audioinput(deviceId);
    callingRepository.refreshAudioInput();
  };

  const switchSpeakerOutput = (deviceId: string) => {
    mediaDevicesHandler.currentDeviceId.audiooutput(deviceId);
  };

  const toggleCamera = (call: Call) => callingRepository.toggleCamera(call);

  const toggleMute = (call: Call, muteState: boolean) => callingRepository.muteCall(call, muteState);

  if (!joinedCall || !joinedCall.conversation || joinedCall.conversation.removed_from_conversation()) {
    return null;
  }

  const toggleDetachedWindowScreenShare = (call: Call) => {
    toggleScreenshare(call, DesktopScreenShareMenu.DETACHED_WINDOW);
  };

  const {conversation} = joinedCall;

  const isScreenshareActive =
    hasAvailableScreensToShare && customScreenShareMenu === DesktopScreenShareMenu.DETACHED_WINDOW;

  return (
    <Fragment>
      {isDetachedWindow && !!videoGrid?.grid.length && (
        <FullscreenVideoCall
          key={conversation.id}
          videoGrid={videoGrid}
          call={joinedCall}
          activeCallViewTab={activeCallViewTab}
          conversation={conversation}
          canShareScreen={callingRepository.supportsScreenSharing}
          maximizedParticipant={maximizedParticipant}
          callingRepository={callingRepository}
          mediaDevicesHandler={mediaDevicesHandler}
          isMuted={isMuted}
          muteState={muteState}
          isChoosingScreen={isScreenshareActive}
          switchCameraInput={switchCameraInput}
          switchMicrophoneInput={switchMicrophoneInput}
          switchSpeakerOutput={switchSpeakerOutput}
          switchBlurredBackground={status => callingRepository.switchVideoBackgroundBlur(status)}
          setMaximizedParticipant={setMaximizedParticipant}
          setActiveCallViewTab={setActiveCallViewTab}
          toggleMute={toggleMute}
          toggleCamera={toggleCamera}
          toggleScreenshare={toggleDetachedWindowScreenShare}
          leave={leave}
          changePage={changePage}
        />
      )}

      {isScreenshareActive && <ChooseScreen choose={callingRepository.onChooseScreen} />}
    </Fragment>
  );
};

export {CallingContainer};

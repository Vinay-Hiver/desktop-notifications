import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import IncomingCallStrip from './IncomingCallStrip';
import ringtone from './incoming-call.mp3';
import { useIncomingCall, acceptCall, endCall } from '../../incomingCall';

/** Shows the call strip at the bottom of the Omni app while a call rings or is connected; plays the ringtone while ringing. */
export default function CallStripHost() {
  const { call, accepted, acceptedAt } = useIncomingCall();
  const navigate = useNavigate();
  const location = useLocation();
  const audio = useRef(null);

  useEffect(() => {
    if (call && !accepted) {
      const a = new Audio(ringtone);
      a.loop = true;
      a.play().catch(() => { /* blocked until the agent interacts with the page */ });
      audio.current = a;
      return () => { a.pause(); audio.current = null; };
    }
    return undefined;
  }, [call, accepted]);

  if (!call) return null;
  const openCall = () => navigate(`/?${new URLSearchParams({ inbox: call.inbox, view: call.view, conv: call.id })}`);
  const onCallPage = location.pathname === '/' && new URLSearchParams(location.search).get('conv') === call.id;

  return (
    <IncomingCallStrip
      key={call.id}
      isAccepted={accepted}
      contactName={call.name}
      contactNumber={call.phone}
      acceptedAt={acceptedAt}
      showFullView={!onCallPage}
      onAccept={() => { acceptCall(); openCall(); }}
      onReject={endCall}
      onOpenFullView={openCall}
    />
  );
}

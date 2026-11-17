import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PhoneIncomingIcon } from '@animateicons/react/lucide';
import './IncomingCallStrip.css';
import callAcceptIcon from './icons/call-accept.svg';
import callRejectIcon from './icons/call-reject.svg';
import genericAvatarIcon from './icons/generic-avatar.svg';
import microphoneIcon from './icons/microphone.svg';
import pauseIcon from './icons/pause.svg';
import endCallIcon from './icons/end-call.svg';
import fullViewIcon from './icons/full-view.svg';
import phoneIncomingIcon from './icons/phone-incoming.svg';

/**
 * Incoming call strip, ported from VinaySC/voice-channel (IncomingCallStrip).
 * Ringing: caller, "Incoming call… Waiting for 00:05", Accept / Reject.
 * Accepted: green "Connected 00:12" pill, open full view, mute / pause / end call.
 */
const formatTime = (totalSeconds) => {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const IncomingCallStrip = ({ isAccepted, contactName, contactNumber, acceptedAt, showFullView, onAccept, onReject, onOpenFullView }) => {
  const [seconds, setSeconds] = useState(1);
  const [now, setNow] = useState(Date.now());
  const [isExiting, setIsExiting] = useState(false);
  const iconRef = useRef(null);

  // Waiting timer while ringing; connected timer once accepted.
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isAccepted) setSeconds((prev) => prev + 1);
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [isAccepted]);

  // Ring animation on the phone icon every 2s while ringing.
  useEffect(() => {
    if (isAccepted) return undefined;
    const trigger = () => iconRef.current?.startAnimation?.();
    trigger();
    const id = setInterval(trigger, 2000);
    return () => clearInterval(id);
  }, [isAccepted]);

  const handleReject = () => {
    setIsExiting(true);
    setTimeout(() => onReject(), 150);
  };

  const connectedSeconds = acceptedAt ? Math.max(0, Math.floor((now - acceptedAt) / 1000)) : 0;
  const label = contactName ? `${contactName} (${contactNumber})` : `Unknown (${contactNumber})`;

  return (
    <div className={`incoming-call-strip-container ${isExiting ? 'exiting' : ''}`}>
      <div className="incoming-call-strip">
        <div className="profile-details">
          <div className="avatar-circle">
            <img src={genericAvatarIcon} alt="" width="28" height="28" />
          </div>
          <span className="profile-name">{label}</span>
        </div>

        <div className="call-info-wrapper">
          <AnimatePresence mode="wait">
            {!isAccepted ? (
              <motion.div key="incoming-badge" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="call-info-badge">
                <div className="call-icon-animated">
                  <PhoneIncomingIcon ref={iconRef} size={16} color="#cbd5e1" />
                </div>
                <span className="call-status">Incoming call...</span>
                <span className="call-timer">Waiting for {formatTime(seconds)}</span>
              </motion.div>
            ) : (
              <motion.div key="connected-pill" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="connected-pill">
                <img src={phoneIncomingIcon} alt="" width="16" height="16" />
                <span className="connected-status">Connected</span>
                <span className="connected-timer">{formatTime(connectedSeconds)}</span>
                {showFullView && (
                  <div className="call-action-item">
                    <button className="icon-btn-action" onClick={(e) => { e.stopPropagation(); onOpenFullView?.(); }}>
                      <img src={fullViewIcon} alt="" width="16" height="16" />
                    </button>
                    <span className="tooltip">Open full view</span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="call-actions">
          <AnimatePresence mode="wait">
            {!isAccepted ? (
              <motion.div key="incoming-actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="action-group">
                <button className="btn-accept" onClick={onAccept}>
                  <img src={callAcceptIcon} alt="" width="14" height="14" />
                  <span>Accept</span>
                </button>
                <button className="btn-reject" onClick={handleReject}>
                  <img src={callRejectIcon} alt="" width="14" height="14" />
                  <span>Reject</span>
                </button>
              </motion.div>
            ) : (
              <motion.div key="connected-actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="connected-actions">
                <div className="call-action-item">
                  <button className="icon-btn-action"><img src={microphoneIcon} alt="" width="16" height="16" /></button>
                  <span className="tooltip">Mute</span>
                </div>
                <div className="call-action-item">
                  <button className="icon-btn-action"><img src={pauseIcon} alt="" width="16" height="16" /></button>
                  <span className="tooltip">Pause</span>
                </div>
                <div className="call-action-item">
                  <button className="btn-end-call" onClick={handleReject}><img src={endCallIcon} alt="" width="16" height="16" /></button>
                  <span className="tooltip">End call</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallStrip;

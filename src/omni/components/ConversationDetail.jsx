import React, { useState, useEffect } from 'react';
import './ConversationDetail.css';
import ReplySection from './ReplySection';
import ConversationMenu from './ConversationMenu';
import { Icon } from '../../icons/Icon';

// Icons
import headerAssignIcon from '../assets/icons/header-assign.svg';
import headerShareIcon from '../assets/icons/header-share.svg';
import syncPlusIcon from '../assets/icons/sync-plus.svg';
import subjectSplitIcon from '../assets/icons/subject-split.svg';
import subjectForwardIcon from '../assets/icons/subject-forward.svg';
import replyAllIcon from '../assets/icons/reply-all.svg';
import kebabIcon from '../assets/icons/kebab-menu.svg';
import smallReplyIcon from '../assets/icons/small-reply.svg';
import smallForwardIcon from '../assets/icons/small-forward.svg';
import chevronDownIcon from '../assets/icons/s-chevron-down.svg';

// The ⋮ menu at the top right of an email (only "Reply" and "Reply all" do something here).
const EMAIL_MENU = [
  { value: 'reply', label: 'Reply', icon: 'reply' },
  { value: 'reply-all', label: 'Reply all', icon: 'replyall' },
  { value: 'forward', label: 'Forward', icon: 'forward' },
  { value: 'print', label: 'Print', icon: 'print' },
  { value: 'download', label: 'Download Message', icon: 'download' },
  { value: 'unread', label: 'Mark as unread', icon: 'markasunread' },
  { value: 'delete', label: 'Delete conversation', icon: 'delete' },
];

const ConversationDetail = ({ conversation, signatures, setSignatures, defaultSignatureId }) => {
  const [expandedIds, setExpandedIds] = useState([]);
  const [activeReplyId, setActiveReplyId] = useState(null);
  const scrollRef = React.useRef(null);

  useEffect(() => {
    if (conversation && conversation.messages.length > 0) {
      setExpandedIds([conversation.messages[0].id]);
      setActiveReplyId(null);
    }
  }, [conversation]);

  const toggleExpand = (id) => {
    setExpandedIds(prev => 
      prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]
    );
  };

  const handleReplyAll = (e, id) => {
    e.stopPropagation();
    setActiveReplyId(prev => prev === id ? null : id);
  };

  if (!conversation) return <div className="conversation-detail">Select a conversation</div>;

  const lastIndex = conversation.messages.length - 1;

  return (
    <div className="conversation-detail">
      {/* Upper Bar */}
      <div className="detail-header">
        <div className="header-left">
          <div className="header-icons">
            <button type="button" className="icon-btn detail-icon-btn" aria-label="Assign">
              <img src={headerAssignIcon} alt="" />
            </button>
            <button type="button" className="icon-btn detail-icon-btn" aria-label="Share">
              <img src={headerShareIcon} alt="" />
            </button>
          </div>
          <span className="detail-divider" />
          <button type="button" className="sync-convo-btn">
            <span className="sync-convo-btn__plus"><img src={syncPlusIcon} alt="" /></span>
            Sync conversation
          </button>
        </div>
      </div>

      {/* Subject Bar (stays put; the thread scrolls under it) */}
      <div className="subject-bar-detail">
        <h1 className="subject-text-large">{conversation.subject}</h1>
        <div className="subject-actions">
           <button type="button" className="icon-btn detail-icon-btn" aria-label="Split conversation">
             <img src={subjectSplitIcon} alt="" />
           </button>
           <span className="detail-divider detail-divider--subject" />
           <button type="button" className="icon-btn detail-icon-btn" aria-label="Forward">
             <img src={subjectForwardIcon} alt="" />
           </button>
           <ConversationMenu
             options={EMAIL_MENU}
             onSelect={(value) => {
               const last = conversation.messages[conversation.messages.length - 1]?.id;
               if (value === 'reply' || value === 'reply-all') setActiveReplyId(last);
             }}
           />
        </div>
      </div>
      {/* Scrollable Area */}
      <div className="detail-scroll-area" ref={scrollRef}>
        {/* Messages Container */}
        <div className="messages-container">
          {conversation.messages.map((msg, index) => {
            const isExpanded = expandedIds.includes(msg.id);
            const isReplying = activeReplyId === msg.id;
   
            return (
              <React.Fragment key={msg.id}>
                {isReplying && (
                  <ReplySection 
                    recipientEmail={msg.email} 
                    signatures={signatures}
                    setSignatures={setSignatures}
                    defaultSignatureId={defaultSignatureId}
                    currentInbox={conversation.inbox}
                    onDiscard={(e) => {
                      e.stopPropagation();
                      setActiveReplyId(null);
                    }}
                  />
                )}
                
                {isExpanded ? (
                  <div className="convo-card">
                    <div className="convo-card-header">
                      <div className="convo-avatar" style={{ backgroundColor: msg.avatarColor }}>
                        <span>{msg.initial}</span>
                      </div>
                      <div className="convo-info" onClick={() => toggleExpand(msg.id)} style={{ cursor: 'pointer' }}>
                        <h3 className="convo-email">{msg.email}</h3>
                        <div className="convo-to">
                          To: support@acme.com <img src={chevronDownIcon} alt="Expand" width="14" height="14" style={{ marginLeft: 4 }} />
                        </div>
                      </div>
                      <div className="header-actions-right">
                        <span className="convo-time">{msg.time}</span>
                        <button className="icon-btn" onClick={(e) => handleReplyAll(e, msg.id)}>
                           <img src={replyAllIcon} alt="Reply All" width="16" height="16" />
                        </button>
                        <button className="icon-btn">
                           <img src={kebabIcon} alt="More" width="16" height="16" />
                        </button>
                      </div>
                    </div>
                    <div className="convo-body">
                      {msg.body.split('\n').map((line, i) => (
                        <React.Fragment key={i}>
                          {line}<br />
                        </React.Fragment>
                      ))}
                    </div>
                    <button className="btn-more-content">...</button>
                    <div className="convo-actions">
                      <button className="convo-btn" onClick={(e) => handleReplyAll(e, msg.id)}>
                        <img src={smallReplyIcon} alt="" width="14" height="14" /> Reply
                      </button>
                      <button className="convo-btn">
                        <img src={smallForwardIcon} alt="" width="14" height="14" /> Forward
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="convo-card-collapsed" onClick={() => toggleExpand(msg.id)}>
                    <div className="convo-avatar" style={{ backgroundColor: msg.avatarColor }}>
                      <span>{msg.initial}</span>
                    </div>
                    <div className="convo-info">
                      <h3 className="convo-email">{msg.email}</h3>
                      <p className="collapsed-text">{msg.body.substring(0, 80)}...</p>
                    </div>
                    <span className="convo-time">{msg.time}</span>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="en-footer">
        <button type="button" className="en-footer__btn" onClick={(e) => handleReplyAll(e, conversation.messages[lastIndex]?.id)}><Icon name="reply" size={16} />Reply</button>
      </div>
    </div>
  );
};

export default ConversationDetail;
